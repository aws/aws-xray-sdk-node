/**
 * @module promise_p
 */

/**
 * This module patches native Promise libraries provided by V8 engine
 * so all subsegments generated within Promise are attached to the correct parent.
 */

const contextUtils = require('../context_utils');

const originalThen = Symbol('original then');
const originalCatch = Symbol('original catch');

function patchPromise(Promise) {
  const then = Promise.prototype.then;
  if (!then[originalThen]) {
    Promise.prototype.then = function(onFulfilled, onRejected) {
      if (contextUtils.isAutomaticMode()
        && tryGetCurrentSegment()
      ) {
        const ns = contextUtils.getNamespace();

        onFulfilled = onFulfilled && ns.bind(onFulfilled);
        onRejected = onRejected && ns.bind(onRejected);
      }

      return then.call(this, onFulfilled, onRejected);
    };
    Promise.prototype.then[originalThen] = then;
  }

  const origCatch = Promise.prototype.catch;
  if (origCatch && !origCatch[originalCatch]) {
    Promise.prototype.catch = function (onRejected) {
      if (contextUtils.isAutomaticMode()
        && tryGetCurrentSegment()
      ) {
        const ns = contextUtils.getNamespace();

        onRejected = onRejected && ns.bind(onRejected);
      }

      return origCatch.call(this, onRejected);
    };
    Promise.prototype.catch[originalCatch] = origCatch;
  }
}

function unpatchPromise(Promise) {
  const then = Promise.prototype.then;
  if (then[originalThen]) {
    Promise.prototype.then = then[originalThen];
  }
  const origCatch = Promise.prototype.catch;
  if (origCatch && origCatch[originalCatch]) {
    Promise.prototype.catch = origCatch[originalCatch];
  }
}

function tryGetCurrentSegment() {
  try {
    return contextUtils.getSegment();
  } catch (e) {
    return undefined;
  }
}

function capturePromise() {
  patchPromise(Promise);
}

function uncapturePromise() {
  unpatchPromise(Promise);
}

capturePromise.patchThirdPartyPromise = patchPromise;

module.exports.capturePromise = capturePromise;
module.exports.uncapturePromise = uncapturePromise;
