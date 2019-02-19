var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');

var ServiceConnector = require('../../../lib/middleware/sampling/service_connector');

chai.should();
chai.use(require('sinon-chai'));

function generateMockClient(samplingRules) {
  return {
    makeUnauthenticatedRequest: function(_, _, callback) {
      callback(null, {
        "SamplingRuleRecords": samplingRules,
        "NextToken": null
      });
    }
  };
}

describe('ServiceConnector', function() {
  var sandbox;
  this.beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  this.afterEach(function() {
    sandbox.restore();
  });

  describe('fetchSamplingRules', function() {
    var defaultSamplingRule = {
      "SamplingRule": {
        "RuleName": "Default",
        "RuleARN": "arn:aws:xray:us-west-2:0000000000:sampling-rule/Default",
        "ResourceARN": "*",
        "Priority": 10000,
        "FixedRate": 0.05,
        "ReservoirSize": 1,
        "ServiceName": "*",
        "ServiceType": "*",
        "Host": "*",
        "HTTPMethod": "*",
        "URLPath": "*",
        "Version": 1,
        "Attributes": {}
      },
      "CreatedAt": "1970-01-01T00:00:00.000Z",
      "ModifiedAt": "1970-01-01T00:00:00.000Z"
    };

    var noSamplingRule = {
      "SamplingRule": {
        "RuleName": "no-sampling",
        "RuleARN": "arn:aws:xray:us-west-2:00000000:sampling-rule/no-sampling",
        "ResourceARN": "*",
        "Priority": 1,
        "FixedRate": 0,
        "ReservoirSize": 0,
        "ServiceName": "*",
        "ServiceType": "*",
        "Host": "*",
        "HTTPMethod": "*",
        "URLPath": "/foo",
        "Version": 1,
        "Attributes": {}
      },
      "CreatedAt": "1970-01-01T00:00:00.000Z",
      "ModifiedAt": "1970-01-01T00:00:00.000Z"
    };

    var invalidRule = {
      "SamplingRule": {
        "RuleName": "invalid-rule",
        "RuleARN": "arn:aws:xray:us-west-2:00000000:sampling-rule/invalid-rule",
        "ResourceARN": "*",
        "Priority": 1,
        "FixedRate": 0,
        "ReservoirSize": 0,
        "ServiceName": "*",
        "Host": "*",
        "HTTPMethod": "*",
        "URLPath": "/foo",
        "Version": 1,
        "Attributes": {}
      },
      "CreatedAt": "1970-01-01T00:00:00.000Z",
      "ModifiedAt": "1970-01-01T00:00:00.000Z"
    };

    it('filters invalid rules', function(done) {
      sandbox.stub(ServiceConnector, 'client').value(generateMockClient([
        noSamplingRule,
        invalidRule,
        defaultSamplingRule
      ]));

      ServiceConnector.fetchSamplingRules(function(rules) {
        // should contain 2 rules
        assert.include(rules[0], {
          name: noSamplingRule.SamplingRule.RuleName,
          priority: noSamplingRule.SamplingRule.Priority,
          rate: noSamplingRule.SamplingRule.FixedRate,
          host: noSamplingRule.SamplingRule.Host,
          httpMethod: noSamplingRule.SamplingRule.HTTPMethod,
          urlPath: noSamplingRule.SamplingRule.URLPath,
          serviceName: noSamplingRule.SamplingRule.ServiceName,
          serviceType: noSamplingRule.SamplingRule.ServiceType,
          borrow: false
        });

        // default rule should be last
        assert.include(rules[1], {
          name: defaultSamplingRule.SamplingRule.RuleName,
          priority: defaultSamplingRule.SamplingRule.Priority,
          rate: defaultSamplingRule.SamplingRule.FixedRate,
          host: defaultSamplingRule.SamplingRule.Host,
          httpMethod: defaultSamplingRule.SamplingRule.HTTPMethod,
          urlPath: defaultSamplingRule.SamplingRule.URLPath,
          serviceName: defaultSamplingRule.SamplingRule.ServiceName,
          serviceType: defaultSamplingRule.SamplingRule.ServiceType,
          borrow: true
        });

        done();
      });
    });

    it('respects a fixed rate of 0', function(done) {
      sandbox.stub(ServiceConnector, 'client').value(generateMockClient([
        noSamplingRule,
        defaultSamplingRule
      ]));

      ServiceConnector.fetchSamplingRules(function(rules) {
        assert.deepEqual(rules.length, 2);
        assert.include(rules[0], {
          name: noSamplingRule.SamplingRule.RuleName,
          priority: noSamplingRule.SamplingRule.Priority,
          rate: 0,
          host: noSamplingRule.SamplingRule.Host,
          httpMethod: noSamplingRule.SamplingRule.HTTPMethod,
          urlPath: noSamplingRule.SamplingRule.URLPath,
          serviceName: noSamplingRule.SamplingRule.ServiceName,
          serviceType: noSamplingRule.SamplingRule.ServiceType,
          borrow: false
        });

        done();
      });
    });
  });
});