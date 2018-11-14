var assert = require('chai').assert;
var chai = require('chai');
var fs = require('fs');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.should();
chai.use(sinonChai);

var localSampler = require('../../../lib/middleware/sampling/local_sampler');
var LocalReservoir = require('../../../lib/middleware/sampling/local_reservoir');
var Utils = require('../../../lib/utils');

describe('localSampler', function() {
  var sandbox, stubIsSampled;

  var jsonDoc = {
    rules: [
      {
        description: 'moop',
        http_method: 'GET',
        host: '*.foo.com',
        url_path: '/signin/*',
        fixed_target: 0,
        rate: 0
      },
      {
        description: '',
        http_method: 'POST',
        host: '*.moop.com',
        url_path: '/login/*',
        fixed_target: 10,
        rate: 0.05
      }
    ],
    default: {
      fixed_target: 10,
      rate: 0.05
    },
    version: 2
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    stubIsSampled = sandbox.stub(LocalReservoir.prototype, 'isSampled').returns(true);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#setLocalRules', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should loaded with the default rules', function() {
      var rules = localSampler.rules;
      assert(rules);
    });

    it('should return a custom SamplingRules object given a custom rules file location', function() {
      localSampler.rules = null;
      localSampler.setLocalRules('./test/resources/custom_sampling.json');
      assert(localSampler.rules);
    });

    it('should return a custom SamplingRules object given a custom rules source object', function() {
      localSampler.rules = null;
      localSampler.setLocalRules(jsonDoc);
      assert(localSampler.rules);
    });

    it('should load all valid rules from custom SamplingRules object given a version 1 config', function() {
      localSampler.rules = null;
      var v1SamplingRules = {
        rules: [
          {
            description: 'moop',
            http_method: 'GET',
            service_name: '*.foo.com',
            url_path: '/signin/*',
            fixed_target: 0,
            rate: 0
          },
          {
            description: 'noop',
            http_method: 'POST',
            service_name: '*.moop.com',
            url_path: '/login/*',
            fixed_target: 10,
            rate: 0.05
          }
        ],
        default: {
          fixed_target: 10,
          rate: 0.05
        },
        version: 1
      };
      localSampler.setLocalRules(v1SamplingRules);
      var rules = localSampler.rules;
      var rule0 = rules[0];
      var rule1 = rules[1];
      var rule2 = rules[2];

      assert.equal(rule0.host, v1SamplingRules.rules[0].service_name);
      assert.equal(rule0.http_method, v1SamplingRules.rules[0].http_method);
      assert.equal(rule0.url_path, v1SamplingRules.rules[0].url_path);
      assert.equal(rule0.description, v1SamplingRules.rules[0].description);
      assert.instanceOf(rule0.reservoir, LocalReservoir);
      
      assert.equal(rule1.host, v1SamplingRules.rules[1].service_name);
      assert.equal(rule1.http_method, v1SamplingRules.rules[1].http_method);
      assert.equal(rule1.url_path, v1SamplingRules.rules[1].url_path);
      assert.equal(rule1.description, v1SamplingRules.rules[1].description);
      assert.instanceOf(rule1.reservoir, LocalReservoir);

      assert.isTrue(rule2.default);
      assert.instanceOf(rule2.reservoir, LocalReservoir);
    });

    describe('given a config file', function() {
      var sandbox;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should parse the matchers rules', function() {
        localSampler.setLocalRules(jsonDoc);
        var rules = localSampler.rules;
        var rule0 = rules[0];
        var rule1 = rules[1];
        var rule2 = rules[2];

        assert.equal(rule0.host, jsonDoc.rules[0].host);
        assert.equal(rule0.http_method, jsonDoc.rules[0].http_method);
        assert.equal(rule0.url_path, jsonDoc.rules[0].url_path);
        assert.instanceOf(rule0.reservoir, LocalReservoir);

        assert.equal(rule1.host, jsonDoc.rules[1].host);
        assert.equal(rule1.http_method, jsonDoc.rules[1].http_method);
        assert.equal(rule1.url_path, jsonDoc.rules[1].url_path);
        assert.instanceOf(rule1.reservoir, LocalReservoir);

        assert.isTrue(rule2.default);
        assert.instanceOf(rule2.reservoir, LocalReservoir);
      });
    });

    it('should accept a default fixed_target of 0 and a rate of 0', function() {
      sandbox.stub(fs, 'readFileSync');
      sandbox.stub(JSON, 'parse').returns({
        default: {
          fixed_target: 0,
          rate: 0
        },
        version: 1
      });

      localSampler.setLocalRules('path/here');
      assert.isTrue(localSampler.rules[0].default);
    });

    it('should throw an error if the file is missing a "version" attribute', function() {
      var source = { rules: [] };
      assert.throws(function() { localSampler.setLocalRules(source); }, 'Missing "version" attribute.');
    });

    it('should throw an error if the file the version is not valid', function() {
      var source = { rules: [], version: 'moop' };
      assert.throws(function() { localSampler.setLocalRules(source); }, 'Unknown version "moop".');
    });

    it('should throw an error if the file is missing a "default" object', function() {
      var source = { rules: [], version: 1 };
      assert.throws(function() { localSampler.setLocalRules(source); },
        'Expecting "default" object to be defined with attributes "fixed_target" and "rate".');
    });

    it('should throw an error if the "default" object contains an invalid attribute', function() {
      var source = { default: { fixed_target: 10, rate: 0.05, url_path: '/signin/*' }, version: 1};

      assert.throws(function() { localSampler.setLocalRules(source); },
        'Invalid attribute for default: url_path. Valid attributes for default are "fixed_target" and "rate".');
    });

    it('should throw an error if the "default" object is missing required attributes', function() {
      var source = { default: { fixed_target: 10 }, version: 1};
      assert.throws(function() { localSampler.setLocalRules(source); }, 'Missing required attributes for default: rate.');
    });

    it('should throw an error if any rule contains invalid attributes', function() {
      var source = {
        rules: [{
          host: 'www.worththewait.io',
          http_method: 'PUT',
          url_path: '/signin/*',
          moop: 'moop',
          fixed_target: 10,
          rate: 0.05
        }],
        default: {
          fixed_target: 10,
          rate: 0.05
        },
        version: 2
      };

      assert.throws(function() { localSampler.setLocalRules(source); }, 'has invalid attribute: moop.');
    });

    it('should throw an error if any rule is missing required attributes', function() {
      var source = {
        rules: [{
          url_path: '/signin/*',
          fixed_target: 10,
          rate: 0.05
        }],
        default: {
          fixed_target: 10,
          rate: 0.05
        },
        version: 2
      };

      assert.throws(function() { localSampler.setLocalRules(source); }, 'is missing required attributes: host,http_method.');
    });

    it('should throw an error if any rule attributes have an invalid value', function() {
      var source = {
        rules: [{
          host: 'www.worththewait.io',
          http_method: null,
          url_path: '/signin/*',
          fixed_target: 10,
          rate: 0.05
        }],
        default: {
          fixed_target: 10,
          rate: 0.05
        },
        version: 2
      };

      assert.throws(function() { localSampler.setLocalRules(source); }, 'attribute "http_method" has invalid value: null.');
    });
  });

  describe('#shouldSample', function() {
    var sandbox, fakeReservoir;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeReservoir = new LocalReservoir(10, 0.05);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should match the default rule and return true', function() {
      localSampler.rules = [{
        default: true,
        reservoir: fakeReservoir
      }];

      assert.isTrue(localSampler.shouldSample('hello.moop.com', 'GET', '/home/moop/hello'));
      stubIsSampled.should.have.been.calledOnce;
    });

    it('should match the customer rule by calling Utils.wildcardMatch on each attribute', function() {
      var matchStub = sandbox.stub(Utils, 'wildcardMatch').returns(true);

      localSampler.rules = [{
        http_method: 'POST',
        host: '*.moop.com',
        url_path: '/login/*',
        reservoir: fakeReservoir
      }];

      var sampleRequest = {
        host: 'hello.moop.com',
        httpMethod: 'POST',
        urlPath: '/login/moop/hello'
      };

      localSampler.shouldSample(sampleRequest);
      stubIsSampled.should.have.been.calledOnce;

      matchStub.should.have.been.calledThrice;
      matchStub.should.have.been.calledWithExactly('/login/*', '/login/moop/hello');
      matchStub.should.have.been.calledWithExactly('POST', 'POST');
      matchStub.should.have.been.calledWithExactly('*.moop.com', 'hello.moop.com');
    });

    it('should fail to match the customer rule and not call isSampled', function() {
      sandbox.stub(Utils, 'wildcardMatch').returns(false);

      localSampler.rules = [{
        http_method: '.',
        host: '.',
        url_path: '.',
        reservoir: fakeReservoir
      }];

      var sampleRequest = {
        host: 'hello.moop.com',
        http_method: 'GET',
        urlPath: '/login/moop/hello'
      };

      assert.isFalse(localSampler.shouldSample(sampleRequest));
      stubIsSampled.should.not.have.been.called;
    });
  });
});
