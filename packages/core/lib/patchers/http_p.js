/**
 * @module http_p
 */

/**
 * This module patches the HTTP and HTTPS node built-in libraries and returns a copy of the module with tracing enabled.
 */

var url = require('url');

var contextUtils = require('../context_utils');
var Utils = require('../utils');

var logger = require('../logger');
var events = require('events');

/**
 * Wraps the http/https.request() and .get() calls to automatically capture information for the segment.
 * This patches the built-in HTTP and HTTPS modules globally. If using a 3rd party HTTP library,
 * it should still use HTTP under the hood. Be sure to patch globally before requiring the 3rd party library.
 * 3rd party library compatibility is best effort. Some incompatibility issues may arise.
 * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @param {function} subsegmentCallback - a callback that is called with the subsegment, the Node.js
 *   http.ClientRequest, the Node.js http.IncomingMessage (if a response was received) and any error issued,
 *   allowing custom annotations and metadata to be added.
 *   to be added to the subsegment.
 * @alias module:http_p.captureHTTPsGlobal
 */

var captureHTTPsGlobal = function captureHTTPsGlobal(module, downstreamXRayEnabled, subsegmentCallback) {
  if (!module.__request)
    enableCapture(module, downstreamXRayEnabled, subsegmentCallback);
};

/**
 * Wraps the http/https.request() and .get() calls to automatically capture information for the segment.
 * Returns an instance of the HTTP or HTTPS module that is patched.
 * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @param {function} subsegmentCallback - a callback that is called with the subsegment, the Node.js
 *   http.ClientRequest, and the Node.js http.IncomingMessage to allow custom annotations and metadata
 *   to be added to the subsegment.
 * @alias module:http_p.captureHTTPs
 * @returns {http|https}
 */

var captureHTTPs = function captureHTTPs(module, downstreamXRayEnabled, subsegmentCallback) {
  if (module.__request)
    return module;

  var tracedModule = {};

  Object.keys(module).forEach(function(val) {
    tracedModule[val] = module[val];
  });

  enableCapture(tracedModule, downstreamXRayEnabled, subsegmentCallback);
  return tracedModule;
};

function enableCapture(module, downstreamXRayEnabled, subsegmentCallback) {
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

    // Short circuit if the HTTP request has no options or is already being captured
    if (!options || (options.headers && (options.headers['X-Amzn-Trace-Id']))) {
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
      if (subsegmentCallback)
        subsegmentCallback(subsegment, this, null, e);

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

      // Only need to remove our listener & re-emit if we're not listening using the errorMonitor,
      // e.g. the app is running on Node 10. Otherwise the errorMonitor will re-emit automatically.
      // See: https://github.com/aws/aws-xray-sdk-node/issues/318
      // TODO: Remove this logic once node 12 support is deprecated
      if (!events.errorMonitor && this.listenerCount('error') <= 1) {
        this.removeListener('error', errorCapturer);
        this.emit('error', e);
      }
    };

    var optionsCopy = Utils.objectWithoutProperties(options, ['Segment'], true);

    var req = baseFunc(...(hasUrl ? [arg0, optionsCopy] : [options]), function(res) {
      res.on('end', function() {
        if (subsegmentCallback)
          subsegmentCallback(subsegment, this.req, res);

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
        // if no callback provided by user application, AND no explicit response listener
        // added by user application, then we consume the response so the 'end' event fires
        // See: https://nodejs.org/api/http.html#http_class_http_clientrequest
      } else if (res.req && res.req.listenerCount('response') === 0) {
        res.resume();
      }
    });

    // Use errorMonitor if available (in Node 12.17+), otherwise fall back to standard error listener
    // See: https://nodejs.org/dist/latest-v12.x/docs/api/events.html#events_eventemitter_errormonitor
    req.on(events.errorMonitor || 'error', errorCapturer);

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
