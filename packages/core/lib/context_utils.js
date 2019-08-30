/**
 * @module context_utils
 */

var cls = require('continuation-local-storage');

var logger = require('./logger');
var Segment = require('./segments/segment');
var Subsegment = require('./segments/attributes/subsegment');

var cls_mode = true;
var NAMESPACE ='AWSXRay';
var SEGMENT = 'segment';

var contextOverride = false;

var contextUtils = {
  CONTEXT_MISSING_STRATEGY: {
    RUNTIME_ERROR: {
      contextMissing: function contextMissingRuntimeError(message) {
        throw new Error(message);
      }
    },
    LOG_ERROR: {
      contextMissing: function contextMissingLogError(message) {
        var err = new Error(message);
        logger.getLogger().error(err.stack);
      }
    }
  },

  contextMissingStrategy: {},

  /**
   * Resolves the segment or subsegment given manual mode and params on the call required.
   * @param [Segment|Subsegment] segment - The segment manually provided via params.XraySegment, if provided.
   * @returns {Segment|Subsegment}
   * @alias module:context_utils.resolveManualSegmentParams
   */

  resolveManualSegmentParams: function resolveManualSegmentParams(params) {
    if (params && !contextUtils.isAutomaticMode()) {
      var xraySegment = params.XRaySegment || params.XraySegment;
      var segment = params.Segment;
      var found = null;

      if (xraySegment && (xraySegment instanceof Segment || xraySegment instanceof Subsegment)) {
        found = xraySegment;
        delete params.XRaySegment;
        delete params.XraySegment;
      } else if (segment && (segment instanceof Segment || segment instanceof Subsegment)) {
        found = segment;
        delete params.Segment;
      }

      return found;
    }
  },

  getNamespace: function getNamespace() {
    return cls.getNamespace(NAMESPACE) || cls.createNamespace(NAMESPACE);
  },

  /**
   * Resolves the segment or subsegment given manual or automatic mode.
   * @param [Segment|Subsegment] segment - The segment manually provided, if provided.
   * @returns {Segment|Subsegment}
   * @alias module:context_utils.resolveSegment
   */

  resolveSegment: function resolveSegment(segment) {
    if (cls_mode) {
      return this.getSegment();
    } else if (segment && !cls_mode) {
      return segment;
    } else if (!segment && !cls_mode) {
      contextUtils.contextMissingStrategy.contextMissing('No sub/segment specified. A sub/segment must be provided for manual mode.');
    }
  },

  /**
   * Returns the current segment or subsegment.  For use with in automatic mode only.
   * @returns {Segment|Subsegment}
   * @alias module:context_utils.getSegment
   */

  getSegment: function getSegment() {
    if (cls_mode) {
      var segment = cls.getNamespace(NAMESPACE).get(SEGMENT);

      if (!segment) {
        contextUtils.contextMissingStrategy.contextMissing('Failed to get the current sub/segment from the context.');
      } else if (segment instanceof Segment && process.env.LAMBDA_TASK_ROOT && segment.facade == true) {
        segment.resolveLambdaTraceData();
      }

      return segment;
    } else {
      contextUtils.contextMissingStrategy.contextMissing('Cannot get sub/segment from context. Not supported in manual mode.');
    }
  },

  /**
   * Sets the current segment or subsegment.  For use with in automatic mode only.
   * @param [Segment|Subsegment] segment - The sub/segment to set.
   * @returns {Segment|Subsegment}
   * @alias module:context_utils.setSegment
   */

  setSegment: function setSegment(segment) {
    if (cls_mode) {
      if (!cls.getNamespace(NAMESPACE).set(SEGMENT, segment))
        logger.getLogger().warn('Failed to set the current sub/segment on the context.');
    } else {
      contextUtils.contextMissingStrategy.contextMissing('Cannot set sub/segment on context. Not supported in manual mode.');
    }
  },

  /**
   * Returns true if in automatic mode, otherwise false.
   * @returns {Segment|Subsegment}
   * @alias module:context_utils.isAutomaticMode
   */

  isAutomaticMode: function isAutomaticMode() {
    return cls_mode;
  },

  /**
   * Enables automatic mode. Automatic mode uses 'continuation-local-storage'.
   * @see https://github.com/othiym23/node-continuation-local-storage
   * @alias module:context_utils.enableAutomaticMode
   */

  enableAutomaticMode: function enableAutomaticMode() {
    cls_mode = true;
    cls.createNamespace(NAMESPACE);

    logger.getLogger().debug('Overriding AWS X-Ray SDK mode. Set to automatic mode.');
  },

  /**
   * Disables automatic mode. Current segment or subsegment then must be passed manually
   * via the parent optional on captureFunc, captureAsyncFunc etc.
   * @alias module:context_utils.enableManualMode
   */

  enableManualMode: function enableManualMode() {
    cls_mode = false;

    if (cls.getNamespace(NAMESPACE))
      cls.destroyNamespace(NAMESPACE);

    logger.getLogger().debug('Overriding AWS X-Ray SDK mode. Set to manual mode.');
  },

  /**
   * Sets the context missing strategy if no context missing strategy is set using the environment variable with
   * key AWS_XRAY_CONTEXT_MISSING. The context missing strategy's contextMissing function will be called whenever
   * trace context is not found.
   * @param {string|function} strategy - The strategy to set. Valid string values are 'LOG_ERROR' and 'RUNTIME_ERROR'.
   *                                     Alternatively, a custom function can be supplied, which takes a error message string.
   */

  setContextMissingStrategy: function setContextMissingStrategy(strategy) {
    if (!contextOverride) {
      if (typeof strategy === 'string') {
        var lookupStrategy = contextUtils.CONTEXT_MISSING_STRATEGY[strategy.toUpperCase()];

        if (lookupStrategy) {
          contextUtils.contextMissingStrategy.contextMissing = lookupStrategy.contextMissing;

          if (process.env.AWS_XRAY_CONTEXT_MISSING)
            logger.getLogger().debug('AWS_XRAY_CONTEXT_MISSING is set. Configured context missing strategy to ' +
              process.env.AWS_XRAY_CONTEXT_MISSING + '.');
          else
            logger.getLogger().debug('Configured context missing strategy to: ' + strategy);
        } else {
          throw new Error('Invalid context missing strategy: ' + strategy + '. Valid values are ' +
            Object.keys(contextUtils.CONTEXT_MISSING_STRATEGY) + '.');
        }
      } else if (typeof strategy === 'function') {
        contextUtils.contextMissingStrategy.contextMissing = strategy;
        logger.getLogger().info('Configured custom context missing strategy to function: ' + strategy.name);
      } else {
        throw new Error('Context missing strategy must be either a string or a custom function.');
      }

    } else {
      logger.getLogger().warn('Ignoring call to setContextMissingStrategy as AWS_XRAY_CONTEXT_MISSING is set. ' +
        'The current context missing strategy will not be changed.');
    }
  }
};

cls.createNamespace(NAMESPACE);
logger.getLogger().debug('Starting the AWS X-Ray SDK in automatic mode (default).');

if (process.env.AWS_XRAY_CONTEXT_MISSING) {
  contextUtils.setContextMissingStrategy(process.env.AWS_XRAY_CONTEXT_MISSING);
  contextOverride = true;
} else {
  contextUtils.contextMissingStrategy.contextMissing = contextUtils.CONTEXT_MISSING_STRATEGY.RUNTIME_ERROR.contextMissing;
  logger.getLogger().debug('Using default context missing strategy: RUNTIME_ERROR');
}

module.exports = contextUtils;
