var logger = require('../../logger');
var ServiceConnector = require('./service_connector');
var ruleCache = require('./rule_cache');
var DEFAULT_INTERVAL = 5 * 60 * 1000; // 5 minutes on sampling rules fetch

/**
 * The RulePoller that periodically fetch sampling rules from X-Ray service
 * and load them into RuleCache.
 * @module RulePoller
 */
var RulePoller = {

  start: function start() {
    if(this.poller) clearInterval(this.poller);

    // Refresh sampling rules cache with no jitter upon start.
    refresh(false);
    this.poller = setInterval(refresh, DEFAULT_INTERVAL);
    this.poller.unref();
  },
};

var refresh = function refresh(jitter){
  // Add jitter by default unless explicitly told not to.
  jitter = typeof jitter === 'undefined' ? true : jitter;

  if(jitter) {
    var delay = getJitter();
    setTimeout(refreshWithFirewall, delay);
  }
  else
    refreshWithFirewall();
};

var refreshWithFirewall = function refreshWithFirewall() {
  try {
    refreshCache();
  } catch (e) {
    logger.getLogger().warn('Encountered unexpected exception when fetching sampling rules: ' + e);
  }
};

var refreshCache = function refreshCache() {
  // Timestamp should be generated *before* the actual outbound call to ensure
  // we don't mark the cache as being fresher than it actually is.
  var now = Math.floor(new Date().getTime() / 1000);

  // Pass a callback that only runs when the new rules are
  // successfully fetched. 
  ServiceConnector.fetchSamplingRules(function(err, newRules) {
    if (err) {
      logger.getLogger().warn('Failed to retrieve sampling rules from X-Ray service:', err);
    } else if(newRules.length !== 0) {
      ruleCache.loadRules(newRules);
      ruleCache.timestamp(now);
      logger.getLogger().info('Successfully refreshed centralized sampling rule cache.');
    }
  });
};

// A random jitter of up to 5 seconds is injected after every run to ensure
// the calls eventually get evenly distributed over the 5 minute window.
var getJitter = function getJitter() {
  return Math.random() * 5;
};

module.exports = RulePoller;
