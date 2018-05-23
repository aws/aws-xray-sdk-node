/**
 * Represents a Reservoir object that keeps track of the number of traces per second sampled and
 * the fixed rate for a given sampling rule. This information is fetched from X-Ray serivce.
 * It decides if a given trace should be borrowed or sampled or not sampled based on the state of current second.
 * @constructor
 */
function Reservoir () {
  this.init();
}

Reservoir.prototype.init = function init() {
  this.quota = null;
  this.TTL = null;
  this.takenThisSec = 0;
  this.borrowedThisSec = 0;
  this.reportInterval = 1;
  this.reportElapsed = 0;
};

Reservoir.prototype.borrowOrTake = function borrowOrTake(now, canBorrow) {
  this.adjustThisSec(now);
  // Don't borrow if the quota is available and fresh.
  if(this.quota >= 0 && this.TTL >= now) {
    if(this.takenThisSec >= this.quota)
      return false;

    this.takenThisSec++;
    return 'take';
  }

  // Otherwise try to borrow if the quota is not present or expired.
  if(canBorrow) {
    if(this.borrowedThisSec >= 1)
      return false;

    this.borrowedThisSec++;
    return 'borrow';
  }
};

Reservoir.prototype.adjustThisSec = function adjustThisSec(now) {
  if (now !== this.thisSec) {
    this.takenThisSec = 0;
    this.borrowedThisSec = 0;
    this.thisSec = now;
  }
};

Reservoir.prototype.loadNewQuota = function loadNewQuota(quota, TTL, interval) {
  if(quota) this.quota = quota;
  if(TTL) this.TTL = TTL;
  if(interval) this.reportInterval = interval/10; // Report interval is always time of 10.
};

Reservoir.prototype.timeToReport = function timeToReport() {
  if(this.reportElapsed + 1 >= this.reportInterval) {
    this.reportElapsed = 0;
    return true;
  } else {
    this.reportElapsed += 1;
    return false;
  }
};

module.exports = Reservoir;
