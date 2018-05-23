var Utils = require('../../utils');
var Reservoir = require('./reservoir');


/**
 * The data model for a sampling rule defined using X-Ray API CreateSamplingRules.
 * It should be only instantiated directly from the X-Ray API response.
 * @constructor
 */
function SamplingRule(name, priority, rate, reservoirSize,
                      host, httpMethod, urlPath, serviceName, serviceType) {
  this.init(name, priority, rate, reservoirSize,
            host, httpMethod, urlPath, serviceName, serviceType);
}

SamplingRule.prototype.init = function init(name, priority, rate, reservoirSize,
                                            host, httpMethod, urlPath, serviceName, serviceType) {
  this.name = name;
  this.priority = priority;
  this.rate = rate;
  this.host = host;
  this.httpMethod = httpMethod;
  this.urlPath = urlPath;
  this.serviceName = serviceName;
  this.serviceType = serviceType;
  this.reservoir = new Reservoir();
  this.borrow = !!reservoirSize;
  this.resetStatistics();
};

SamplingRule.prototype.match = function match(sampleRequest) {
  var host = sampleRequest.host;
  var httpMethod = sampleRequest.httpMethod;
  var serviceName = sampleRequest.serviceName;
  var urlPath = sampleRequest.urlPath;
  var serviceType = sampleRequest.serviceType;

  return this.isDefault() || (!host || Utils.wildcardMatch(this.host, host))
    && (!httpMethod || Utils.wildcardMatch(this.httpMethod, httpMethod))
    && (!serviceName || Utils.wildcardMatch(this.serviceName, serviceName))
    && (!urlPath || Utils.wildcardMatch(this.urlPath, urlPath))
    && (!serviceType || Utils.wildcardMatch(this.serviceType, serviceType));
};

SamplingRule.prototype.snapshotStatistics = function snapshotStatistics() {
  var statistics = {
    requestCount: this.requestCount,
    borrowCount: this.borrowCount,
    sampledCount: this.sampledCount
  };

  this.resetStatistics();
  return statistics;
};

SamplingRule.prototype.merge = function merge(rule) {
  this.reservoir = rule.reservoir;
  this.requestCount = rule.requestCount;
  this.borrowCount = rule.borrowCount;
  this.sampledCount = rule.sampledCount;
  rule = null; // unref the old rule so it can be garbage collected.
};

SamplingRule.prototype.isDefault = function isDefault() {
  return this.name === 'Default'; // "Default" is a reserved keyword from X-Ray back-end.
};

SamplingRule.prototype.incrementRequestCount = function incrementRequestCount() {
  this.requestCount++;
};

SamplingRule.prototype.incrementBorrowCount = function incrementBorrowCount() {
  this.borrowCount++;
};

SamplingRule.prototype.incrementSampledCount = function incrementSampledCount() {
  this.sampledCount++;
};

SamplingRule.prototype.setRate = function setRate(rate) {
  this.rate = rate;
};

SamplingRule.prototype.getRate = function getRate() {
  return this.rate;
};

SamplingRule.prototype.getName = function getName() {
  return this.name;
};

SamplingRule.prototype.getPriority = function getPriority() {
  return this.priority;
};

SamplingRule.prototype.getReservoir = function getReservoir() {
  return this.reservoir;
};

SamplingRule.prototype.resetStatistics = function resetStatistics() {
  this.requestCount = 0;
  this.borrowCount = 0;
  this.sampledCount = 0;
};

SamplingRule.prototype.canBorrow = function canBorrow() {
  return this.borrow;
};

SamplingRule.prototype.everMatched = function everMatched() {
  return this.requestCount > 0;
};

SamplingRule.prototype.timeToReport = function timeToReport() {
  return this.reservoir.timeToReport();
};

module.exports = SamplingRule;
