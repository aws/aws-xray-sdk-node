/**
 * @module promise_p
 */

/**
 * This module patches native Promise libraries provided by V8 engine
 * so all subsegments generated within Promise are attached to the correct parent.
 */

var contextUtils = require('../context_utils');

function patchPromise(Promise) {
  var then = Promise.prototype.then;
  Promise.prototype.then = function(onFulfilled, onRejected) {
    if (contextUtils.isAutomaticMode()
      && tryGetCurrentSegment()
    ) {
      var ns = contextUtils.getNamespace();

      onFulfilled = onFulfilled && ns.bind(onFulfilled);
      onRejected = onRejected && ns.bind(onRejected);
    }

    return then.call(this, onFulfilled, onRejected);
  };
}

function tryGetCurrentSegment() {
  var segment = null;
  try {
    segment = contextUtils.getSegment();
  } catch(e) { /**/ }
  return segment;
}

function capturePromise() {
  patchPromise(Promise);
}

capturePromise.patchThirdPartyPromise = patchPromise;

module.exports.capturePromise = capturePromise;
