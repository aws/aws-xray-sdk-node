var TTL = 60 * 60; // The cache expires 1 hour after the last refresh time.

/**
 * The rule cache that stores sampling rules fetched from X-Ray service.
 * @module RuleCache
 */
var RuleCache = {
  rules: [],
  lastUpdated: null,

  /**
   * Tries to find a valid rule that matches the sample request.
   * @param {object} sampleRequest - Contains information for rules matching.
   * @param {number} now - Current epoch in seconds.
   * @module RuleCache
   * @function getMatchedRule
   */
  getMatchedRule: function getMatchedRule(sampleRequest, now) {
    if(isExpired(now)) return null;
    var matchedRule;
    this.rules.forEach(function(rule) {
      if(!matchedRule && rule.match(sampleRequest)) matchedRule = rule;
      if(rule.isDefault() && !matchedRule) matchedRule = rule;
    });
    return matchedRule;
  },

  /**
   * Load rules fetched from X-Ray service in order sorted by priorities.
   * @param {object} rules - Newly fetched rules to load.
   * @module RuleCache
   * @function loadRules
   */
  loadRules: function loadRules(rules) {
    // Record the old rules for later merging.
    var oldRules = {};
    this.rules.forEach(function(rule) {
      oldRules[rule.getName()] = rule;
    });

    // Update the rules in the cache.
    this.rules = rules;

    // Transfer state information to refreshed rules.
    this.rules.forEach(function(rule) {
      var oldRule = oldRules[rule.getName()];
      if(oldRule) rule.merge(oldRule);
    });

    // The cache should maintain the order of the rules based on
    // priority. If priority is the same we sort name by alphabet
    // as rule name is unique.
    this.rules.sort(function(a, b) {
      var v = a.getPriority() - b.getPriority();
      if(v !== 0) return v;
      if(a.getName() > b.getName())
        return 1;
      else 
        return -1;
    });
  },

  /**
   * Load targets fetched from X-Ray service.
   * @param {object} targetsMapping - Newly fetched targets map with rule name as key.
   * @module RuleCache
   * @function loadTargets
   */
  loadTargets: function loadTargets(targetsMapping) {
    this.rules.forEach(function(rule) {
      var target = targetsMapping[rule.getName()];
      if(target) {
        rule.getReservoir().loadNewQuota(target.quota, target.TTL, target.interval);
        rule.setRate(target.rate);
      }
    });
  },

  getRules: function getRules() {
    return this.rules;
  },

  timestamp: function timestamp(now) {
    this.lastUpdated = now;
  },

  getLastUpdated: function getLastUpdated() {
    return this.lastUpdated;
  }
};

var isExpired = function isExpired(now) {
  // The cache is considered expired if it is never loaded.
  if(!RuleCache.getLastUpdated()) return true;
  return now > RuleCache.getLastUpdated() + TTL;
};

module.exports = RuleCache;
