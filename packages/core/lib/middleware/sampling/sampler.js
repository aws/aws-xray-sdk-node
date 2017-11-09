
/**
 * Represents a Sampler object that keeps track of the number of traces per second sampled and the fallback rate for a given sampling rule.  It also decides
 * if a given trace should be sampled or not given the configuration options.
 * @constructor
 * @param {number} fixedTarget - An integer value to specify the maximum number of traces per second to sample.
 * @param {number} fallbackRate - A value between 0 and 1 indicating the sampling rate after the maximum traces per second has been hit.
 */

function Sampler (fixedTarget, fallbackRate) {
  this.init(fixedTarget, fallbackRate);
}

Sampler.prototype.init = function init(fixedTarget, fallbackRate) {
  this.usedThisSecond = 0;

  if (typeof fixedTarget === 'number' && fixedTarget % 1 === 0 && fixedTarget >= 0)
    this.fixedTarget = fixedTarget;
  else
    throw new Error('Error in sampling file. Rule attribute "fixed_target" must be a non-negative integer.');

  if (typeof fallbackRate === 'number' && fallbackRate >= 0 && fallbackRate <= 1)
    this.fallbackRate = fallbackRate;
  else
    throw new Error('Error in sampling file. Rule attribute "rate" must be a number between 0 and 1 inclusive.');
};

Sampler.prototype.isSampled = function isSampled() {
  var now = Math.round(new Date().getTime() / 1000);

  if (now !== this.thisSecond) {
    this.usedThisSecond = 0;
    this.thisSecond = now;
  }

  if (this.usedThisSecond >= this.fixedTarget)
    return Math.random() < this.fallbackRate;

  this.usedThisSecond++;
  return true;
};

module.exports = Sampler;
