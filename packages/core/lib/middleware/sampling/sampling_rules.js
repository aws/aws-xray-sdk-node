var fs = require('fs');

var Sampler = require('./sampler');
var Utils = require('../../utils');

var defaultRules = require('../../resources/default_sampling_rules.json');
var logger = require('../../logger');

/**
 * Represents a set of matchers and rules in regards to sampling rates.
 * @constructor
 * @param {string|Object} [source] - The path to the custom sampling rules file, or the source JSON object. If none is provided, the default file will be used.
 */

function SamplingRules(source) {
  this.init(source);
}

SamplingRules.prototype.init = function init(source) {
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
};

SamplingRules.prototype.shouldSample = function shouldSample(serviceName, httpMethod, urlPath) {
  var formatted = '{ http_method: ' + httpMethod + ', service_name: ' + serviceName + ', url_path: ' + urlPath + ' }';
  var matched;

  this.rules.some(function(rule) {
    // Any null parameters provided will be considered an implicit match.
    if (rule.default || (serviceName == null || (Utils.wildcardMatch(rule.service_name, serviceName))
      && (httpMethod == null || Utils.wildcardMatch(rule.http_method, httpMethod))
      && (urlPath == null || Utils.wildcardMatch(rule.url_path, urlPath)))) {

      matched = rule.sampler;

      logger.getLogger().debug('Sampling rule match found for ' + formatted + '. Matched ' + (rule.default ?
        'default' : '{ http_method: ' + rule.http_method + ', service_name: ' + rule.service_name + ', url_path: ' +
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
};

function loadRulesConfig(config) {
  if (!config.version)
    throw new Error('Error in sampling file. Missing "version" attribute.');

  if (config.version === 1)
    return parseRulesConfig(config);
  else
    throw new Error('Error in sampling file. Unknown version "' + config.version + '".');
}

function parseRulesConfig(config) {
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

    defaultRule = { default: true, sampler: new Sampler(config.default.fixed_target, config.default.rate) };
  } else {
    throw new Error('Error in sampling file. Expecting "default" object to be defined with attributes "fixed_target" and "rate".');
  }

  if (Array.isArray(config.rules)) {
    config.rules.forEach(function(rawRule) {
      var params = {};
      var required = { service_name: 1, http_method: 1, url_path: 1, fixed_target: 1, rate: 1 };

      for(var key in rawRule) {
        var value = rawRule[key];

        if (!required[key] && key != 'description')
          throw new Error('Error in sampling file. Rule ' + JSON.stringify(rawRule) + ' has invalid attribute: ' + key + '.');
        else if (key != 'description' && !value && value !== 0)
          throw new Error('Error in sampling file. Rule ' + JSON.stringify(rawRule) + ' attribute "' + key + '" has invalid value: ' + value + '.');
        else {
          params[key] = value;
          delete required[key];
        }
      }

      if (Object.keys(required).length !== 0 && required.constructor === Object)
        throw new Error('Error in sampling file. Rule ' + JSON.stringify(rawRule) + ' is missing required attributes: ' + Object.keys(required) + '.');

      var rule = params;
      rule.sampler = new Sampler(rawRule.fixed_target, rawRule.rate);
      rules.push(rule);
    });
  }

  rules.push(defaultRule);

  return rules;
}

module.exports = SamplingRules;
