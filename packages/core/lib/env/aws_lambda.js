const contextUtils = require('../context_utils')
const mwUtils = require('../middleware/mw_utils')
const LambdaUtils = require('../utils').LambdaUtils
const Segment = require('../segments/segment')
const SegmentEmitter = require('../segment_emitter')
const SegmentUtils = require('../segments/segment_utils')

const logger = require('../logger')
const TraceID = require('../segments/attributes/trace_id')

/**
 * @namespace
 * @ignore
 */
let xAmznTraceIdPrev = null

/**
* Used to initialize segments on AWS Lambda with extra data from the context.
*/
module.exports.init = function init () {
  contextUtils.enableManualMode = function () {
    logger.getLogger().warn('AWS Lambda does not support AWS X-Ray manual mode.')
  }

  SegmentEmitter.disableReusableSocket()
  SegmentUtils.setStreamingThreshold(0)

  /**
   * Disabling all centralized sampling in Lambda environments. The sampling decisions would be
   * uselessly applied to the facade segment, and the sampling pollers were causing errors.
   *
   * See: https://github.com/aws/aws-xray-sdk-node/issues/217
   */
  logger.getLogger().info('Disabling centralized sampling in Lambda environment.')
  mwUtils.disableCentralizedSampling()

  const namespace = contextUtils.getNamespace()
  namespace.enter(namespace.createContext())
  contextUtils.setSegment(facadeSegment())
}

const facadeSegment = function facadeSegment () {
  const segment = new Segment('facade')
  const whitelistFcn = ['addNewSubsegment', 'addSubsegment', 'removeSubsegment', 'toString', 'addSubsegmentWithoutSampling', 'addNewSubsegmentWithoutSampling']
  const silentFcn = ['incrementCounter', 'decrementCounter', 'isClosed', 'close', 'format', 'flush']
  const xAmznTraceId = process.env._X_AMZN_TRACE_ID

  for (const key in segment) {
    if (typeof segment[key] === 'function' && whitelistFcn.indexOf(key) === -1) {
      if (silentFcn.indexOf(key) === -1) {
        segment[key] = (function () {
          const func = key
          return function facade () {
            logger.getLogger().warn('Function "' + func + '" cannot be called on an AWS Lambda segment. Please use a subsegment to record data.')
          }
        })()
      } else {
        segment[key] = function facade () {

        }
      }
    }
  }

  segment.trace_id = TraceID.Invalid().toString()
  segment.isClosed = function () {
    return true
  }
  segment.in_progress = false
  segment.counter = 1
  segment.notTraced = true
  segment.facade = true

  segment.reset = function reset () {
    this.trace_id = TraceID.Invalid().toString()
    this.id = '00000000'
    delete this.subsegments
    this.notTraced = true
  }

  segment.resolveLambdaTraceData = function resolveLambdaTraceData () {
    const xAmznLambda = process.env._X_AMZN_TRACE_ID

    if (xAmznLambda) {
      // This check resets the trace data whenever a new trace header is read to not leak data between invocations
      if (xAmznLambda !== xAmznTraceIdPrev) {
        this.reset()

        if (LambdaUtils.populateTraceData(segment, xAmznLambda)) {
          xAmznTraceIdPrev = xAmznLambda
        }
      }
    } else {
      this.reset()
      contextUtils.contextMissingStrategy.contextMissing('Missing AWS Lambda trace data for X-Ray. ' +
          'Ensure Active Tracing is enabled and no subsegments are created outside the function handler.')
    }
  }

  // Test for valid trace data during SDK startup. It's likely we're still in the cold-start portion of the
  // code at this point and a valid trace header has not been set
  if (LambdaUtils.validTraceData(xAmznTraceId)) {
    if (LambdaUtils.populateTraceData(segment, xAmznTraceId)) {
      xAmznTraceIdPrev = xAmznTraceId
    }
  }

  return segment
}
