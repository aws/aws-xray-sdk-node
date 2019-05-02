var crypto = require('crypto');
var AWS = require('aws-sdk/global');
var Xray = require('aws-sdk/clients/xray');
var logger = require('../../logger');
var SamplingRule = require('./sampling_rule');
var DaemonConfig = require('../../daemon_config')
const util = require('util');


/**
 * The ServiceConnector that calls X-Ray service and convert the API response bodies to data models
 * defined in the X-Ray SDK and return them to the pollers.
 * @module ServiceConnector
 */
var ServiceConnector = {
  // client_id is a 12 byte cryptographically secure random hex
  // identifying the SDK instance and is generated during SDK initialization/
  // This is required when reporting sampling to X-Ray back-end.
  clientId: crypto.randomBytes(12).toString('hex'),
  client: new Xray({endpoint: util.format('http://%s:%d', DaemonConfig.tcp_ip, DaemonConfig.tcp_port)}),

  fetchSamplingRules: function fetchSamplingRules(callback) {

    this.client.makeUnauthenticatedRequest('getSamplingRules', null, function(err, data) {
      if(err)
        logger.getLogger().warn(err.stack);
      else {
        var newRules = assembleRules(data);
        callback(newRules);
      }
    });
  },

  fetchTargets: function fetchTargets(rules, callback) {
    var params = constructStatisticsDocs(rules);

    this.client.makeUnauthenticatedRequest('getSamplingTargets', params, function(err, data) {
      if(err) {
        logger.getLogger().warn(err.stack);
      }
      else{
        var targetsMapping = assembleTargets(data);
        var ruleFreshness = dateToEpoch(data['LastRuleModification']);
        callback(targetsMapping, ruleFreshness);
      }
    });
  }
};

var constructStatisticsDocs = function constructStatisticsDocs(rules) {
  var documents = [];
  var now = Math.floor(new Date().getTime() / 1000);

  rules.forEach(function(rule) {
    var statistics =  rule.snapshotStatistics();
    var doc = {
      'RuleName': rule.getName(),
      'ClientID': ServiceConnector.clientId,
      'RequestCount': statistics.requestCount,
      'BorrowCount': statistics.borrowCount,
      'SampledCount': statistics.sampledCount,
      'Timestamp': now
    };
    documents.push(doc);
  });

  return {SamplingStatisticsDocuments: documents};
};

var assembleRules = function assembleRules(data) {
  var newRules = [];
  var ruleList = data['SamplingRuleRecords'];
  ruleList.forEach(function(ruleRecord) {
    ruleRecord = ruleRecord['SamplingRule'];
    // For forward compatibility reason right now it only
    // deals with version 1 sampling rules.
    if (isRuleValid(ruleRecord)) {
      var newRule = new SamplingRule(
        ruleRecord['RuleName'],
        ruleRecord['Priority'],
        ruleRecord['FixedRate'],
        ruleRecord['ReservoirSize'],
        ruleRecord['Host'],
        ruleRecord['HTTPMethod'],
        ruleRecord['URLPath'],
        ruleRecord['ServiceName'],
        ruleRecord['ServiceType']
      );
      newRules.push(newRule);
    }
  });
  return newRules;
};

var assembleTargets = function assembleTargets(data) {
  var docs = data['SamplingTargetDocuments'];
  var targetsMapping = {};

  docs.forEach(function(doc) {
    var newTarget = {
      rate: doc['FixedRate'],
      quota: doc['ReservoirQuota'],
      TTL: dateToEpoch(doc['ReservoirQuotaTTL']),
      interval: doc['Interval']
    };
    targetsMapping[doc['RuleName']] = newTarget;
  });

  return targetsMapping;
};

var isRuleValid = function isRuleValid(record) {
  return record['Version'] === 1
    && record['ResourceARN'] === '*'
    && record['Attributes'] && Object.keys(record['Attributes']).length === 0
    && record['ServiceType']
    && record['RuleName']
    && record['Priority']
    && typeof record['FixedRate'] == 'number';
};

var dateToEpoch = function dateToEpoch(date) {
  return new Date(date).getTime() / 1000; 
};

ServiceConnector.client.setupRequestListeners = function setupRequestListeners(request) {
  request.removeListener('validate', AWS.EventListeners.Core.VALIDATE_REGION);
};

module.exports = ServiceConnector;
