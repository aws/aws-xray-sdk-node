var assert = require('chai').assert;
var expect = require('chai').expect;

var SamplingRule = require('../../../lib/middleware/sampling/sampling_rule');

describe('RuleCache', function() {
  var RuleCache = require('../../../lib/middleware/sampling/rule_cache');
  var rule_0 = new SamplingRule(name='a', priority=1, rate=0.1, reservoirSize=1, host='*mydomain*',
                                httpMethod='GET', urlPath='myop', serviceName='random', serviceType='random');
  var rule_1 = new SamplingRule(name='aa', priority=2, rate=0.1, reservoirSize=1, host='*random*',
                                httpMethod='POST', urlPath='random', serviceName='proxy', serviceType='random');
  var rule_2 = new SamplingRule(name='b', priority=2, rate=0.1, reservoirSize=1, host='*',
                                httpMethod='GET', urlPath='ping', serviceName='myapp', serviceType='AWS::EC2::Instance');
  var rule_default = new SamplingRule(name='Default', priority=10000, rate=0.1, reservoirSize=1, host='*',
                                      httpMethod='*', urlPath='*', serviceName='*', serviceType='*');
  var now = Math.floor(new Date().getTime() / 1000);

  beforeEach(function() {
    RuleCache.rules = [];
    RuleCache.timestamp(now);
  });

  describe('#loadRules', function() {
    it('should sort rules in order after load.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);

      sorted_rules = RuleCache.rules;
      assert.equal(sorted_rules[0], rule_0);
      assert.equal(sorted_rules[1], rule_1);
      assert.equal(sorted_rules[2], rule_2);
      assert.equal(sorted_rules[3], rule_default);
    });

    it('should evict rules that no longer exit.', function() {
      RuleCache.loadRules([rule_default, rule_1, rule_0]);
      RuleCache.loadRules([rule_default, rule_2]);

      assert.equal(RuleCache.rules.length, 2);
      assert.equal(RuleCache.rules[0], rule_2);
      assert.equal(RuleCache.rules[1], rule_default);
    });

    it('should preserve sampling state.', function() {
      RuleCache.loadRules([rule_default, rule_0]);
      rule_0.incrementRequestCount();
      rule_0.incrementBorrowCount();
      rule_0.incrementSampledCount();
      rule_0.getReservoir().loadNewQuota(3, now);

      var new_rule_0 = new SamplingRule(name='a', priority=2);
      RuleCache.loadRules([rule_default, new_rule_0]);
      statistics = RuleCache.rules[0].snapshotStatistics();
      reservoir = RuleCache.rules[0].getReservoir();

      assert.equal(statistics.requestCount, 1);
      assert.equal(statistics.borrowCount, 1);
      assert.equal(statistics.sampledCount, 1);
      assert.equal(reservoir.quota, 3);
      assert.equal(reservoir.TTL, now);
    });
  });

  describe('#loadTargets', function() {
    it('should load targets to correct rules.', function() {
      RuleCache.loadRules([rule_default, rule_0]);
      var target_default = {
        quota: 1
      };
      var target_0 = {
        quota: 2
      };
      var target_1 = {
        quota: 3
      };
      var targetsMapping = {
        'Default': target_default,
        'a': target_0,
        'random': target_1
      };
      RuleCache.loadTargets(targetsMapping);

      reservoir_0 = RuleCache.rules[0].getReservoir();
      reservoir_default = RuleCache.rules[1].getReservoir();
      assert.equal(reservoir_0.quota, 2);
      assert.equal(reservoir_default.quota, 1);
    })
  });

  describe('#getMatchedRule', function() {
    it('should match host.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);
      var samplingRequest = {
        host: 'mydomain.com'
      };

      var rule = RuleCache.getMatchedRule(samplingRequest, now);
      assert.equal(rule.getName(), 'a');
    });

    it('should match http method.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);
      var samplingRequest = {
        httpMethod: 'POST'
      };

      var rule = RuleCache.getMatchedRule(samplingRequest, now);
      assert.equal(rule.getName(), 'aa');
    });

    it('should match url path.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);
      var samplingRequest = {
        urlPath: 'ping'
      };

      var rule = RuleCache.getMatchedRule(samplingRequest, now);
      assert.equal(rule.getName(), 'b');
    });

    it('should match service name.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);
      var samplingRequest = {
        serviceName: 'proxy'
      };

      var rule = RuleCache.getMatchedRule(samplingRequest, now);
      assert.equal(rule.getName(), 'aa');
    });

    it('should match service type.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);
      var samplingRequest = {
        serviceType: 'AWS::EC2::Instance'
      };

      var rule = RuleCache.getMatchedRule(samplingRequest, now);
      assert.equal(rule.getName(), 'b');
    });

    it('should alwasy at least match Default.', function() {
      var rules = [rule_default, rule_1, rule_2, rule_0];
      RuleCache.loadRules(rules);
      var samplingRequest = {
        host: 'somedomain',
        urlPath: 'unkown',
      };

      var rule = RuleCache.getMatchedRule(samplingRequest, now);
      assert.isTrue(rule.isDefault());
    });
  });

  describe('#expiredCache', function() {
    var matcher = {
      host: 'myhost.com',
      httpMethod: 'GET',
      urlPath: 'operation',
      serviceName: 'app'
    };

    it('should not match any rule if expires.', function() {
      var rules = [rule_default];
      RuleCache.loadRules(rules);
      RuleCache.timestamp(now - 10800);

      var rule = RuleCache.getMatchedRule(matcher, now);
      assert.equal(rule, null);
    });

    it('should match if the cache is fresh', function() {
      var rules = [rule_default];
      RuleCache.loadRules(rules);
      var rule = RuleCache.getMatchedRule(matcher, now);

      assert.equal(rule, rule_default);
    });
  });
});
