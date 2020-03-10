var contextUtils = require('../context_utils');
var mwUtils = require('../middleware/mw_utils');
var LambdaUtils = require('../utils').LambdaUtils;
var Segment = require('../segments/segment');
var SegmentEmitter = require('../segment_emitter');
var SegmentUtils = require('../segments/segment_utils');

var logger = require('../logger');

/**
* Used to initialize segments on AWS Lambda with extra data from the context.
*/


/**
 * @namespace
 * @ignore
 */
var xAmznTraceIdPrev = null;

module.exports.init = function init() {
  contextUtils.enableManualMode = function() {
    logger.getLogger().warn('AWS Lambda does not support AWS X-Ray manual mode.');
  };

  SegmentEmitter.disableReusableSocket();
  SegmentUtils.setStreamingThreshold(0);

  /** 
   * Disabling all centralized sampling in Lambda environments. The sampling decisions would be
   * uselessly applied to the facade segment, and the sampling pollers were causing errors.
   * 
   * See: https://github.com/aws/aws-xray-sdk-node/issues/217
   */
  logger.getLogger().info('Disabling centralized sampling in Lambda environment.');
  mwUtils.disableCentralizedSampling();

  var namespace = contextUtils.getNamespace();
  namespace.enter(namespace.createContext());
  contextUtils.setSegment(facadeSegment());
};

var facadeSegment = function facadeSegment() {
  var segment = new Segment('facade');
  var whitelistFcn = ['addNewSubsegment', 'addSubsegment', 'removeSubsegment', 'toString'];
  var silentFcn = ['incrementCounter', 'decrementCounter', 'isClosed', 'close', 'format', 'flush'];
  var xAmznTraceId = process.env._X_AMZN_TRACE_ID;

  for (var key in segment) {
    if (typeof segment[key] === 'function' && whitelistFcn.indexOf(key) === -1) {
      if (silentFcn.indexOf(key) === -1) {
        segment[key] = (function() {
          var func = key;
          return function facade() {
            logger.getLogger().warn('Function "' + func + '" cannot be called on an AWS Lambda segment. Please use a subsegment to record data.');
            return;
          };
        })();
      } else {
        segment[key] = function facade() { return; };
      }
    }
  }

  segment.trace_id = null;
  segment.isClosed = function() { return true; };
  segment.in_progress = false;
  segment.counter = 1;
  segment.notTraced = true;
  segment.facade = true;

  segment.reset = function reset() {
    this.trace_id = null;
    this.id = null;
    delete this.subsegments;
    this.notTraced = true;
  };

  segment.resolveLambdaTraceData = function resolveLambdaTraceData() {
    var xAmznLambda = process.env._X_AMZN_TRACE_ID;

    if (xAmznLambda) {
      if (xAmznLambda != xAmznTraceIdPrev) {
        this.reset();

        if (LambdaUtils.populateTraceData(segment, xAmznLambda))
          xAmznTraceIdPrev = xAmznLambda;
      }
    }
    else {
      this.reset();
      contextUtils.contextMissingStrategy.contextMissing('Missing AWS Lambda trace data for X-Ray. Expected _X_AMZN_TRACE_ID to be set.');
    }
  };

  if (LambdaUtils.validTraceData(xAmznTraceId)) {
    if (LambdaUtils.populateTraceData(segment, xAmznTraceId))
      xAmznTraceIdPrev = xAmznTraceId;
  }

  return segment;
};
