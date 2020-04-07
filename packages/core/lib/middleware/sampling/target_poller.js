var rulePoller = require('./rule_poller');
var serviceConnector = require('./service_connector');
var ruleCache = require('./rule_cache');
var logger = require('../../logger');
var DEFAULT_INTERVAL = 10 * 1000; // 10 seconds on sampling targets fetch


/**
 * The TargetPoller that periodically fetch sampling targets from X-Ray service
 * and load them into RuleCache.
 * @module TargetPoller
 */
var TargetPoller = {

  interval: DEFAULT_INTERVAL,

  start: function start() {
    this.poller = setInterval(refreshWithFirewall, DEFAULT_INTERVAL + getJitter());
    this.poller.unref();
  },
};

var refreshWithFirewall = function refreshWithFirewall() {
  try {
    refresh();
  } catch (e) {
    logger.getLogger().warn('Encountered unexpected exception when fetching sampling targets: ' + e);
  }
};

var refresh = function refresh() {
  var candidates = getCandidates();
  if(candidates && candidates.length > 0) {
    serviceConnector.fetchTargets(candidates, function(err, targetsMapping, ruleFreshness) {
      if (err) {
        logger.getLogger().warn('Failed to retrieve sampling targets from X-Ray service:', err);
        return;
      }

      ruleCache.loadTargets(targetsMapping);
      if(ruleFreshness > ruleCache.getLastUpdated()) {
        logger.getLogger().info('Performing out-of-band sampling rule polling to fetch updated rules.');
        rulePoller.start();
      }

      logger.getLogger().info('Successfully reported rule statistics to get new sampling quota.');
    });
  }
};

// Don't report a rule statistics if any of the conditions is met:
// 1. The report time hasn't come (some rules might have larger report intervals).
// 2. The rule is never matched.
var getCandidates = function getCandidates() {
  var rules = ruleCache.getRules();

  var candidates = [];
  rules.forEach(function(rule) {
    if(rule.everMatched() && rule.timeToReport())
      candidates.push(rule);
  });

  return candidates;
};

// A random jitter of up to 0.1 seconds is injected after every run to ensure
// the calls eventually get evenly distributed over the 10 second window.
var getJitter = function getJitter() {
  return Math.random() / TargetPoller.interval;
};

module.exports = TargetPoller;
