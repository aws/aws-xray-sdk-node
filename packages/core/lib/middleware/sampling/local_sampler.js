var fs = require('fs');

var LocalReservoir = require('./local_reservoir');
var Utils = require('../../utils');

var defaultRules = require('../../resources/default_sampling_rules.json');
var logger = require('../../logger');

/**
 * The local sampler used to make sampling decisions when the decisions are absent in the incoming requests
 * and the default sampler needs to fall back on local rules. It will also be the primary sampler
 * if the default sampler is disabled.
 * @module LocalSampler
 */
var LocalSampler = {

  /**
   * Makes a sample decision based on the sample request.
   * @param {object} sampleRequest - Contains information for rules matching.
   * @module LocalSampler
   * @function shouldSample
   */
  shouldSample: function shouldSample(sampleRequest) {
    var host = sampleRequest.host;
    var httpMethod = sampleRequest.httpMethod;
    var urlPath = sampleRequest.urlPath;

    var formatted = '{ http_method: ' + httpMethod + ', host: ' + host + ', url_path: ' + urlPath + ' }';
    var matched;

    this.rules.some(function(rule) {
      // Any null parameters provided will be considered an implicit match.
      if (rule.default || (host == null || (Utils.wildcardMatch(rule.host, host))
        && (httpMethod == null || Utils.wildcardMatch(rule.http_method, httpMethod))
        && (urlPath == null || Utils.wildcardMatch(rule.url_path, urlPath)))) {

        matched = rule.reservoir;

        logger.getLogger().debug('Local sampling rule match found for ' + formatted + '. Matched ' + (rule.default ?
          'default' : '{ http_method: ' + rule.http_method + ', host: ' + rule.host + ', url_path: ' +
          rule.url_path + ' }') + '. Using fixed_target: ' + matched.fixedTarget + ' and rate: ' + matched.fallbackRate + '.');

        return true;
      }
    });

    if (matched) {
      return matched.isSampled();
    } else {
      logger.getLogger().debug('No sampling rule matched for ' + formatted);
      return false;
    }
  },

  /**
   * Set local rules for making sampling decisions.
   * @module LocalSampler
   * @function setLocalRules
   */
  setLocalRules: function setLocalRules(source) {
    if (source) {
      if (typeof source === 'string') {
        logger.getLogger().info('Using custom sampling rules file: ' + source);
        this.rules = loadRulesConfig(JSON.parse(fs.readFileSync(source, 'utf8')));
      } else {
        logger.getLogger().info('Using custom sampling rules source.');
        this.rules = loadRulesConfig(source);
      }
    } else
      this.rules = parseRulesConfig(defaultRules);
  }
};

var loadRulesConfig = function loadRulesConfig(config) {
  if (!config.version)
    throw new Error('Error in sampling file. Missing "version" attribute.');

  if (config.version === 1 || config.version === 2)
    return parseRulesConfig(config);
  else
    throw new Error('Error in sampling file. Unknown version "' + config.version + '".');
};

var parseRulesConfig = function parseRulesConfig(config) {
  var defaultRule;
  var rules = [];

  if (config.default) {
    var missing = [];

    for (var key in config.default) {
      if (key !== 'fixed_target' && key !== 'rate') {
        throw new Error('Error in sampling file. Invalid attribute for default: ' + key +
          '. Valid attributes for default are "fixed_target" and "rate".');
      } else if (typeof config.default[key] !== 'number') {
        throw new Error('Error in sampling file. Default ' + key + ' must be a number.');
      }
    }

    if (typeof config.default.fixed_target === 'undefined')
      missing.push('fixed_target');

    if (typeof config.default.rate === 'undefined')
      missing.push('rate');

    if (missing.length !== 0)
      throw new Error('Error in sampling file. Missing required attributes for default: ' + missing + '.');

    defaultRule = { default: true, reservoir: new LocalReservoir(config.default.fixed_target, config.default.rate) };
  } else {
    throw new Error('Error in sampling file. Expecting "default" object to be defined with attributes "fixed_target" and "rate".');
  }

  if (Array.isArray(config.rules)) {
    config.rules.forEach(function(rawRule) {
      var params = {};
      var required;
      if (config.version === 2)
        required = { host: 1, http_method: 1, url_path: 1, fixed_target: 1, rate: 1 };
      if (config.version === 1)
        required = { service_name: 1, http_method: 1, url_path: 1, fixed_target: 1, rate: 1 };

      for(var key in rawRule) {
        var value = rawRule[key];

        if (!required[key] && key != 'description')
          throw new Error('Error in sampling file. Rule ' + JSON.stringify(rawRule) + ' has invalid attribute: ' + key + '.');
        else if (key != 'description' && !value && value !== 0)
          throw new Error('Error in sampling file. Rule ' + JSON.stringify(rawRule) + ' attribute "' + key + '" has invalid value: ' + value + '.');
        else {
          if (config.version === 2)
            params[key] = value;
          if (config.version === 1 && key === 'service_name')
            params['host'] = value;
          else 
            params[key] = value;
          delete required[key];
        }
      }

      if (Object.keys(required).length !== 0 && required.constructor === Object)
        throw new Error('Error in sampling file. Rule ' + JSON.stringify(rawRule) + ' is missing required attributes: ' + Object.keys(required) + '.');

      var rule = params;
      rule.reservoir = new LocalReservoir(rawRule.fixed_target, rawRule.rate);
      rules.push(rule);
    });
  }

  rules.push(defaultRule);

  return rules;
};

LocalSampler.setLocalRules();
module.exports = LocalSampler;
