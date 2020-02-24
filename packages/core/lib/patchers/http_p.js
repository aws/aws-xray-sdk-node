/**
 * @module http_p
 */

/**
 * This module patches the HTTP and HTTPS node built-in libraries and returns a copy of the module with tracing enabled.
 */

var url = require('url');

var contextUtils = require('../context_utils');
var DaemonConfig = require('../daemon_config');
var ServiceConnector = require('../middleware/sampling/service_connector');
var Utils = require('../utils');

var logger = require('../logger');

/**
 * Wraps the http/https.request() and .get() calls to automatically capture information for the segment.
 * This patches the built-in HTTP and HTTPS modules globally. If using a 3rd party HTTP library,
 * it should still use HTTP under the hood. Be sure to patch globally before requiring the 3rd party library.
 * 3rd party library compatibility is best effort. Some incompatibility issues may arise.
 * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @alias module:http_p.captureHTTPsGlobal
 */

var captureHTTPsGlobal = function captureHTTPsGlobal(module, downstreamXRayEnabled) {
  if (!module.__request)
    enableCapture(module, downstreamXRayEnabled);
};

/**
 * Wraps the http/https.request() and .get() calls to automatically capture information for the segment.
 * Returns an instance of the HTTP or HTTPS module that is patched.
 * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @alias module:http_p.captureHTTPs
 * @returns {http|https}
 */

var captureHTTPs = function captureHTTPs(module, downstreamXRayEnabled) {
  if (module.__request)
    return module;

  var tracedModule = {};

  Object.keys(module).forEach(function(val) {
    tracedModule[val] = module[val];
  });

  enableCapture(tracedModule, downstreamXRayEnabled);
  return tracedModule;
};

function enableCapture(module, downstreamXRayEnabled) {
  function captureOutgoingHTTPs(baseFunc, ...args) {
    let options;
    let callback;
    let hasUrl;
    let urlObj;

    let arg0 = args[0];
    if (typeof args[1] === 'object') {
      hasUrl = true;
      urlObj = typeof arg0 === 'string' ? url.parse(arg0) : arg0;
      options = args[1],
      callback = args[2];
    } else {
      hasUrl = false;
      options = arg0;
      callback = args[1];
    }

    // Short circuit if the HTTP request has no options, is already being captured,
    // or represents a centralized sampling request to the daemon
    if (!options || 
       (options.headers && (options.headers['X-Amzn-Trace-Id'])) ||
       (options.hostname == DaemonConfig.tcp_ip && 
        options.port == DaemonConfig.tcp_port && 
       (options.path == ServiceConnector.samplingRulesPath || 
        options.path == ServiceConnector.samplingTargetsPath)))
    {
      return baseFunc(...args);
    }

    if (typeof options === 'string') {
      options = url.parse(options);
    }

    if (!hasUrl) {
      urlObj = options;
    }

    var parent = contextUtils.resolveSegment(contextUtils.resolveManualSegmentParams(options));
    var hostname = options.hostname || options.host || urlObj.hostname || urlObj.host || 'Unknown host';

    if (!parent) {
      var output = '[ host: ' + hostname;
      output = options.method ? (output + ', method: ' + options.method) : output;
      output += ', path: ' + Utils.stripQueryStringFromPath(options.path || urlObj.path) + ' ]';

      if (!contextUtils.isAutomaticMode()) {
        logger.getLogger().info('Options for request ' + output +
          ' requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
      } else {
        logger.getLogger().info('Options for request ' + output +
          ' is missing the sub/segment context for automatic mode. Ignoring.');
      }

      // Options are not modified, only parsed for logging. We can pass in the original arguments.
      return baseFunc(...args);
    }

    var subsegment = parent.addNewSubsegment(hostname);
    var root = parent.segment ? parent.segment : parent;
    subsegment.namespace = 'remote';

    if (!options.headers)
      options.headers = {};

    options.headers['X-Amzn-Trace-Id'] = 'Root=' + root.trace_id + ';Parent=' + subsegment.id +
      ';Sampled=' + (!root.notTraced ? '1' : '0');

    var errorCapturer = function errorCapturer(e) {
      if (subsegment.http && subsegment.http.response) {
        if (Utils.getCauseTypeFromHttpStatus(subsegment.http.response.status) === 'error') {
          subsegment.addErrorFlag();
        }
        subsegment.close(e, true);
      } else {
        var madeItToDownstream = (e.code !== 'ECONNREFUSED');

        subsegment.addRemoteRequestData(this, null, madeItToDownstream && downstreamXRayEnabled);
        subsegment.close(e);
      }

      if (this._events && this._events.error && this._events.error.length === 1) {
        this.removeListener('error', errorCapturer);
        this.emit('error', e);
      }
    };

    var optionsCopy = Utils.objectWithoutProperties(options, ['Segment'], true);

    var req = baseFunc(...(hasUrl ? [arg0, optionsCopy] : [options]), function(res) {
      res.on('end', function() {
        if (res.statusCode === 429)
          subsegment.addThrottleFlag();

        var cause = Utils.getCauseTypeFromHttpStatus(res.statusCode);

        if (cause)
          subsegment[cause] = true;

        subsegment.addRemoteRequestData(res.req, res, !!downstreamXRayEnabled);
        subsegment.close();
      });

      if (typeof callback === 'function') {
        if (contextUtils.isAutomaticMode()) {
          var session = contextUtils.getNamespace();

          session.run(function() {
            contextUtils.setSegment(subsegment);
            callback(res);
          });
        } else {
          callback(res);
        }
        // if no callback provided and there is only SDK added response listener,
        // we consume the response so the actual end can fire.
      } else if (res && res.listenerCount('end') === 1) {
        res.resume();
      }
    }).on('error', errorCapturer);

    return req;
  }

  module.__request = module.request;
  module.request = function captureHTTPsRequest(...args) {
    return captureOutgoingHTTPs(module.__request, ...args);
  };

  module.__get = module.get;
  module.get = function captureHTTPsGet(...args) {
    return captureOutgoingHTTPs(module.__get, ...args);
  };
}

module.exports.captureHTTPsGlobal = captureHTTPsGlobal;
module.exports.captureHTTPs = captureHTTPs;
