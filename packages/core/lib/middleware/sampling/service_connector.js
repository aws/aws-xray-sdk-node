var crypto = require('crypto');
var logger = require('../../logger');
var SamplingRule = require('./sampling_rule');
var DaemonConfig = require('../../daemon_config');
const util = require('util');
const http = require('http');


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
  samplingRulesPath: '/GetSamplingRules',
  samplingTargetsPath: '/SamplingTargets',
  logger: logger,
  httpClient: http,

  fetchSamplingRules: function fetchSamplingRules(callback) {
    const body = '{}';  // Payload needed for GetSamplingRules POST request
    const options = getOptions(this.samplingRulesPath, body.length);
    
    const req = this.httpClient.request(options, res => {
      var data = '';
      res.on('data', d => {
        data += d;
      });
        
      res.on('error', error => {
        callback(error);
      });
  
      res.on('end', () => {
        var dataObj;
        try {
          dataObj = JSON.parse(data);
        } catch (err) {
          callback(err);
        }

        if (dataObj === null) {
          callback(new Error('AWS X-Ray GetSamplingRules API returned null response'));
        }

        var newRules = assembleRules(dataObj);
        callback(null, newRules);
      });
    });

    req.on('error', (err) => {
      this.logger.getLogger().error(`Failed to connect to X-Ray daemon at ${options.hostname}:${options.port} to get sampling rules.`);
      callback(err);
    });
    
    req.write(body);
    req.end();
  },

  fetchTargets: function fetchTargets(rules, callback) {
    const body = JSON.stringify(constructStatisticsDocs(rules));
    const options = getOptions(this.samplingTargetsPath, body.length);
    
    const req = this.httpClient.request(options, res => {
      var data = '';
      res.on('data', d => {
        data += d;
      });
        
      res.on('error', error => {
        callback(error)
      });
  
      res.on('end', () => {
        var dataObj;
        try {
          dataObj = JSON.parse(data);
        } catch (err) {
          callback(err);
        }

        if (dataObj === null || !dataObj['LastRuleModification']) {
          callback(new Error('AWS X-Ray SamplingTargets API returned invalid response'));
        }

        var targetsMapping = assembleTargets(dataObj);
        var ruleFreshness = dateToEpoch(dataObj['LastRuleModification']);
        callback(null, targetsMapping, ruleFreshness);
      });
    });

    req.on('error', (err) => {
      this.logger.getLogger().error(`Failed to connect to X-Ray daemon at ${options.hostname}:${options.port} to get sampling targets.`);
      callback(err);
    });
    
    req.write(body);
    req.end();
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
  var ruleList = data['SamplingRuleRecords'] || [];
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
  var docs = data['SamplingTargetDocuments'] || [];
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

var getOptions = function getOptions(path, contentLength) {
  const options = {
    hostname: DaemonConfig.tcp_ip,
    port: DaemonConfig.tcp_port,
    method: 'POST',
    path: path,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': contentLength,
      'Host': util.format('%s:%d', DaemonConfig.tcp_ip, DaemonConfig.tcp_port)
    }
  };

  return options;
};

module.exports = ServiceConnector;
