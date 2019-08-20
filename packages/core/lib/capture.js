/**
 * Capture module.
 * @module capture
 */

var contextUtils = require('./context_utils');

var logger = require('./logger');

/**
 * Wrap to automatically capture information for the segment.
 * @param {string} name - The name of the new subsegment.
 * @param {function} fcn - The function context to wrap. Can take a single 'subsegment' argument.
 * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
 * @alias module:capture.captureFunc
 * @return {*} - Returns the result if any by executing the provided function.
 */

var captureFunc = function captureFunc(name, fcn, parent) {
  validate(name, fcn);

  var current, executeFcn;

  var parentSeg = contextUtils.resolveSegment(parent);

  if (!parentSeg) {
    logger.getLogger().warn('Failed to capture function.');
    return fcn();
  }

  current = parentSeg.addNewSubsegment(name);
  executeFcn = captureFcn(fcn, current);

  try {
    const response = executeFcn(current);
    current.close();
    return response;
  } catch (e) {
    current.close(e);
    throw(e);
  }
};

/**
 * Wrap to automatically capture information for the sub/segment.  You must close the segment
 * manually from within the function.
 * @param {string} name - The name of the new subsegment.
 * @param {function} fcn - The function context to wrap. Must take a single 'subsegment' argument and call 'subsegment.close([optional error])' when the async function completes.
 * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
 * @alias module:capture.captureAsyncFunc
 * @return {*} - Returns a promise by executing the provided async function.
 */

var captureAsyncFunc = function captureAsyncFunc(name, fcn, parent) {
  validate(name, fcn);

  var current, executeFcn;
  var parentSeg = contextUtils.resolveSegment(parent);

  if (!parentSeg) {
    logger.getLogger().warn('Failed to capture async function.');
    return fcn();
  }

  current = parentSeg.addNewSubsegment(name);
  executeFcn = captureFcn(fcn, current);

  try {
    return executeFcn(current);
  } catch (e) {
    current.close(e);
    throw(e);
  }
};

/**
 * Wrap to automatically capture information for the sub/segment. This wraps the callback and returns a function.
 * when executed, all arguments are passed through accordingly. An additional argument is appended to gain access to the newly created subsegment.
 * For this reason, always call the captured callback with the full list of arguments.
 * @param {string} name - The name of the new subsegment.
 * @param {function} fcn - The function context to wrap. Can take a single 'subsegment' argument.
 * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
 * @alias module:capture.captureCallbackFunc
 */

var captureCallbackFunc = function captureCallbackFunc(name, fcn, parent) {
  validate(name, fcn);

  var base = contextUtils.resolveSegment(parent);

  if (!base) {
    logger.getLogger().warn('Failed to capture callback function.');
    return fcn;
  }

  base.incrementCounter();

  return function() {
    var parentSeg = contextUtils.resolveSegment(parent);
    var args = Array.prototype.slice.call(arguments);

    captureFunc(name, fcn.bind.apply(fcn, [null].concat(args)), parentSeg);

    base.decrementCounter();
  }.bind(this);
};

function captureFcn(fcn, current) {
  var executeFcn;

  if (contextUtils.isAutomaticMode()) {
    var session = contextUtils.getNamespace();

    var contextFcn = function() {
      var value;

      session.run(function() {
        contextUtils.setSegment(current);
        value = fcn(current);
      });
      return value;
    };

    executeFcn = contextFcn;
  } else {
    executeFcn = fcn;
  }

  return executeFcn;
}

function validate(name, fcn) {
  var error;

  if (!name || typeof name !== 'string') {
    error = 'Param "name" must be a non-empty string.';
    logger.getLogger().error(error);
    throw new Error(error);
  } else if (typeof fcn !== 'function') {
    error = 'Param "fcn" must be a function.';
    logger.getLogger().error(error);
    throw new Error(error);
  }
}

module.exports.captureFunc = captureFunc;
module.exports.captureAsyncFunc = captureAsyncFunc;
module.exports.captureCallbackFunc = captureCallbackFunc;
