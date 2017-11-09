/**
 * Capture module.
 * @module aws_p
 */

var semver = require('semver');

var Aws = require('../segments/attributes/aws');
var contextUtils = require('../context_utils');
var Utils = require('../utils');

var logger = require('../logger');

var minVersion = '2.7.15';

var throttledErrorDefault = function throttledErrorDefault() {
  return false; // If the customer doesn't provide an aws-sdk with a throttled error function, we can't make assumptions.
};

/**
 * Configures the AWS SDK to automatically capture information for the segment.
 * All created clients will automatically be captured.  See 'captureAWSClient'
 * for additional details.
 * @param {AWS} awssdk - The Javascript AWS SDK.
 * @alias module:aws_p.captureAWS
 * @returns {AWS}
 * @see https://github.com/aws/aws-sdk-js
 */

var captureAWS = function captureAWS(awssdk) {
  if (!semver.gte(awssdk.VERSION, minVersion))
    throw new Error ('AWS SDK version ' + minVersion + ' or greater required.');

  for (var prop in awssdk) {
    if (awssdk[prop].serviceIdentifier) {
      var Service = awssdk[prop];
      Service.prototype.customizeRequests(captureAWSRequest);
    }
  }

  return awssdk;
};

/**
 * Configures any AWS Client instance to automatically capture information for the segment.
 * For manual mode, a param with key called 'Segment' is required as a part of the AWS
 * call paramaters, and must reference a Segment or Subsegment object.
 * @param {AWS.Service} service - An instance of a AWS service to wrap.
 * @alias module:aws_p.captureAWSClient
 * @returns {AWS.Service}
 * @see https://github.com/aws/aws-sdk-js
 */

var captureAWSClient = function captureAWSClient(service) {
  service.customizeRequests(captureAWSRequest);
  return service;
};

function captureAWSRequest(req) {
  var parent = contextUtils.resolveSegment(contextUtils.resolveManualSegmentParams(req.params));

  if (!parent) {
    var output = this.serviceIdentifier + '.' + req.operation;

    if (!contextUtils.isAutomaticMode()) {
      logger.getLogger().info('Call ' + output + ' requires a segment object' +
        ' on the request params as "XRaySegment" for tracing in manual mode. Ignoring.');
    } else {
      logger.getLogger().info('Call ' + output +
        ' is missing the sub/segment context for automatic mode. Ignoring.');
    }
    return req;
  }

  var throttledError = this.throttledError || throttledErrorDefault;

  var stack = (new Error()).stack;
  var subsegment = parent.addNewSubsegment(this.serviceIdentifier);
  var traceId = parent.segment ? parent.segment.trace_id : parent.trace_id;

  req.on('build', function(req) {
    req.httpRequest.headers['X-Amzn-Trace-Id'] = 'Root=' + traceId + ';Parent=' + subsegment.id +
      ';Sampled=' + (subsegment.segment.notTraced ? '0' : '1');
  }).on('complete', function(res) {
    subsegment.addAttribute('namespace', 'aws');
    subsegment.addAttribute('aws', new Aws(res, subsegment.name));

    var httpRes = res.httpResponse;

    if (httpRes) {
      subsegment.addAttribute('http', new HttpResponse(httpRes));

      if (httpRes.statusCode === 429 || (res.error && throttledError(res.error)))
        subsegment.addThrottleFlag();
    }

    if (res.error) {
      var err = { message: res.error.message, name: res.error.code, stack: stack };

      if (httpRes && httpRes.statusCode) {
        if (Utils.getCauseTypeFromHttpStatus(httpRes.statusCode) == 'error') {
          subsegment.addErrorFlag();
        }
        subsegment.close(err, true);
      }
      else
        subsegment.close(err);
    } else {
      if (httpRes && httpRes.statusCode) {
        var cause = Utils.getCauseTypeFromHttpStatus(httpRes.statusCode);

        if (cause)
          subsegment[cause] = true;
      }
      subsegment.close();
    }
  });

  if (!req.__send) {
    req.__send = req.send;

    req.send = function(callback) {
      if (contextUtils.isAutomaticMode()) {
        var session = contextUtils.getNamespace();

        session.run(function() {
          contextUtils.setSegment(subsegment);
          req.__send(callback);
        });
      } else {
        req.__send(callback);
      }
    };
  }
}

function HttpResponse(res) {
  this.init(res);
}

HttpResponse.prototype.init = function init(res) {
  this.response = {
    status: res.statusCode || '',
  };

  if (res.headers && res.headers['content-length'])
    this.response.content_length = res.headers['content-length'];
};

module.exports.captureAWSClient = captureAWSClient;
module.exports.captureAWS = captureAWS;
