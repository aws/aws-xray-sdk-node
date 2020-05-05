var assert = require('chai').assert;
var expect = require('chai').expect;
var chai = require('chai');
var sinon = require('sinon');
var rewire = require('rewire');

var DaemonConfig = require('../../../lib/daemon_config');
var ServiceConnector = require('../../../lib/middleware/sampling/service_connector');
var TestEmitter = require('../test_utils').TestEmitter;

chai.should();
chai.use(require('sinon-chai'));

function buildFakeResponse() {
  var response = new TestEmitter();
  return response;
};

function buildFakeRequest(res, rules) {
  var rulesObj = {
    'SamplingRuleRecords': rules,
    'NextToken': null
  };

  var request = new TestEmitter();
  request.method = 'GET';
  request.url = '/';
  request.connection = { remoteAddress: 'myhost' };
  request.write = () => {};
  request.end = () => {
    res.emit('data', JSON.stringify(rulesObj));
    res.emit('end');
  };
  return request;
};

function generateMockClient(samplingRules) {
  var res = buildFakeResponse();
  var req = buildFakeRequest(res, samplingRules);
  return buildFakeHttpClient(req, res);
};

function buildFakeHttpClient(req, res) {
  return {
    request: function(options, callback) {
      callback(res);
      return req;
    }
  };
};

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
      'SamplingRule': {
        'RuleName': 'Default',
        'RuleARN': 'arn:aws:xray:us-west-2:0000000000:sampling-rule/Default',
        'ResourceARN': '*',
        'Priority': 10000,
        'FixedRate': 0.05,
        'ReservoirSize': 1,
        'ServiceName': '*',
        'ServiceType': '*',
        'Host': '*',
        'HTTPMethod': '*',
        'URLPath': '*',
        'Version': 1,
        'Attributes': {}
      },
      'CreatedAt': '1970-01-01T00:00:00.000Z',
      'ModifiedAt': '1970-01-01T00:00:00.000Z'
    };

    var noSamplingRule = {
      'SamplingRule': {
        'RuleName': 'no-sampling',
        'RuleARN': 'arn:aws:xray:us-west-2:00000000:sampling-rule/no-sampling',
        'ResourceARN': '*',
        'Priority': 1,
        'FixedRate': 0,
        'ReservoirSize': 0,
        'ServiceName': '*',
        'ServiceType': '*',
        'Host': '*',
        'HTTPMethod': '*',
        'URLPath': '/foo',
        'Version': 1,
        'Attributes': {}
      },
      'CreatedAt': '1970-01-01T00:00:00.000Z',
      'ModifiedAt': '1970-01-01T00:00:00.000Z'
    };

    var invalidRule = {
      'SamplingRule': {
        'RuleName': 'invalid-rule',
        'RuleARN': 'arn:aws:xray:us-west-2:00000000:sampling-rule/invalid-rule',
        'ResourceARN': '*',
        'Priority': 1,
        'FixedRate': 0,
        'ReservoirSize': 0,
        'ServiceName': '*',
        'Host': '*',
        'HTTPMethod': '*',
        'URLPath': '/foo',
        'Version': 1,
        'Attributes': {}
      },
      'CreatedAt': '1970-01-01T00:00:00.000Z',
      'ModifiedAt': '1970-01-01T00:00:00.000Z'
    };

    it('filters invalid rules', function(done) {
      sandbox.stub(ServiceConnector, 'httpClient').value(generateMockClient([
        noSamplingRule,
        invalidRule,
        defaultSamplingRule
      ]));

      ServiceConnector.fetchSamplingRules(function(_, rules) {
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
      sandbox.stub(ServiceConnector, 'httpClient').value(generateMockClient([
        noSamplingRule,
        defaultSamplingRule
      ]));

      ServiceConnector.fetchSamplingRules(function(_, rules) {
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

    it('handles invalid responses from the API gracefully', function() {
      var rewiredConnector = rewire('../../../lib/middleware/sampling/service_connector');
      var assembleRules = rewiredConnector.__get__('assembleRules');

      var res = assembleRules({});
      assert.isArray(res);
    });
  });

  describe('fetchSamplingTargets', function() {
    it('handles invalid responses from the API gracefully', function() {
      var rewiredConnector = rewire('../../../lib/middleware/sampling/service_connector');
      var assembleTargets = rewiredConnector.__get__('assembleTargets');

      var res = assembleTargets({});
      assert.deepEqual(res, {});
    });
  });

  describe('DaemonConfig', function() {
    const DEFAULT_DAEMON_ADDRESS = '127.0.0.1';
    const DEFAULT_DAEMON_PORT = 2000;
    var requestSpy;

    beforeEach(function() {
      delete process.env.AWS_XRAY_DAEMON_ADDRESS;
      DaemonConfig.setDaemonAddress(`${DEFAULT_DAEMON_ADDRESS}:${DEFAULT_DAEMON_PORT}`);
      requestSpy = sandbox.stub(ServiceConnector.httpClient, 'request').returns({
        write: () => {},
        end: () => {},
        on: (event, func) => {}
      });
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('Should call the daemon at its default address', function() {
      ServiceConnector.fetchSamplingRules(function() {});
      ServiceConnector.fetchTargets([], function() {});

      assert.equal(DEFAULT_DAEMON_ADDRESS, requestSpy.getCall(0).args[0].hostname);
      assert.equal(DEFAULT_DAEMON_PORT, requestSpy.getCall(0).args[0].port);

      assert.equal(DEFAULT_DAEMON_ADDRESS, requestSpy.getCall(1).args[0].hostname);
      assert.equal(DEFAULT_DAEMON_PORT, requestSpy.getCall(1).args[0].port);
    });

    it('Should call the daemon at new address when updated', function() {
      const new_address = '1.1.1.1';
      const new_port = '1999';

      DaemonConfig.setDaemonAddress(`${new_address}:${new_port}`);

      ServiceConnector.fetchSamplingRules(function() {});
      ServiceConnector.fetchTargets([], function() {});

      assert.equal(new_address, requestSpy.getCall(0).args[0].hostname);
      assert.equal(new_port, requestSpy.getCall(0).args[0].port);

      assert.equal(new_address, requestSpy.getCall(1).args[0].hostname);
      assert.equal(new_port, requestSpy.getCall(1).args[0].port);
    });
  });

  describe('HttpException', function() {
    var logging;
    beforeEach(function() {
      var path = '../../../lib/logger';
      delete require.cache[require.resolve(path)];
      logging = require(path);
    });

    it('should log an error when the HTTP request fails', function() {
      let response = buildFakeResponse();
      let request = buildFakeRequest(response, []);
      sandbox.spy(ServiceConnector.logger, 'getLogger');
      sandbox.stub(ServiceConnector, 'httpClient')
        .value(buildFakeHttpClient(request, response));
      
      ServiceConnector.fetchSamplingRules(function() {});
      request.emit('error', new Error('Fake ECONNREFUSED error'));

      expect(ServiceConnector.logger.getLogger).to.be.calledOnce;      
    });
  });
});
