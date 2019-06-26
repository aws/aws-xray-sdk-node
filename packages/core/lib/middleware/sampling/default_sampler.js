var logger = require('../../logger');
const util = require('util');

var SegmentUtils = require('../../segments/segment_utils');
/**
 * The default sampler used to make sampling decisions when the decisions are absent in the incoming requests.
 * The sampler use pollers to poll sampling rules from X-Ray service.
 * @module DefaultSampler
 */
var DefaultSampler = {
  localSampler: require('./local_sampler'),
  rulePoller: require('./rule_poller'),
  targetPoller: require('./target_poller'),
  ruleCache: require('./rule_cache'),
  started: false,

  /**
   * Makes a sample decision based on the sample request.
   * @param {object} sampleRequest - Contains information for rules matching.
   * @module DefaultSampler
   * @function shouldSample
   */
  shouldSample: function shouldSample(sampleRequest) {
    try {
      if (!this.started) this.start();
      if (!sampleRequest.serviceType) sampleRequest.serviceType = SegmentUtils.origin;
      var now = Math.floor(new Date().getTime() / 1000);
      var matchedRule = this.ruleCache.getMatchedRule(sampleRequest, now);
      if(matchedRule) {
        logger.getLogger().debug(util.format('Rule %s is matched.', matchedRule.getName()));
        return processMatchedRule(matchedRule, now);
      }
      else {
        logger.getLogger().info('No effective centralized sampling rule match. Fallback to local rules.');
        return this.localSampler.shouldSample(sampleRequest);
      }
    } catch (err) {
      logger.getLogger().error('Unhandled exception by the SDK during making sampling decisions: ' + err);
    }
  },

  /**
   * Set local rules in case there is a need to fallback.
   * @module DefaultSampler
   * @function setLocalRules
   */
  setLocalRules: function setLocalRules(source) {
    this.localSampler.setLocalRules(source);
  },

  /**
   * Start the pollers to poll sampling rules and targets from X-Ray service.
   * @module DefaultSampler
   * @function start
   */
  start: function start() {
    if(!this.started) {
      this.rulePoller.start();
      this.targetPoller.start();
      this.started = true;
    }
  }
};

var processMatchedRule = function processMatchedRule(rule, now) {
  // As long as a rule is matched we increment request counter.
  rule.incrementRequestCount();
  var reservoir = rule.getReservoir();
  var sample = true;
  // We check if we can borrow or take from reservoir first.
  var decision = reservoir.borrowOrTake(now, rule.canBorrow());
  if(decision === 'borrow')
    rule.incrementBorrowCount();
  else if (decision === 'take')
    rule.incrementSampledCount();
  // Otherwise we compute based on FixedRate of this sampling rule.
  else if (Math.random() <= rule.getRate())
    rule.incrementSampledCount();
  else
    sample = false;

  if(sample)
    return rule.getName();
  else
    return false;
};

module.exports = DefaultSampler;
