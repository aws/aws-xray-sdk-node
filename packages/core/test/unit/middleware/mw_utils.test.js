var assert = require('chai').assert;
var sinon = require('sinon');

var MWUtils = require('../../../lib/middleware/mw_utils');
var localSampler = require('../../../lib/middleware/sampling/local_sampler');
var Segment = require('../../../lib/segments/segment');

//headers are case-insensitive
var XRAY_HEADER = 'x-amzn-trace-id';

describe('Middleware utils', function() {
  var defaultName = 'defaultName';
  var envVarName = 'envDefaultName';
  var hostName = 'www.myhost.com';
  var traceId = '1-f9194208-2c7ad569f5d6ff149137be86';

  function reloadMWUtils() {
    var path = '../../../lib/middleware/mw_utils';
    delete require.cache[require.resolve(path)];
    MWUtils = require(path);
  }

  describe('#enableDynamicNaming', function() {
    afterEach(function() {
      reloadMWUtils();
    });

    it('should flag dynamic mode if no pattern is given', function() {
      MWUtils.enableDynamicNaming();

      assert.isTrue(MWUtils.dynamicNaming);
    });

    it('should flag dynamic mode and set the host regex if a pattern is given', function() {
      MWUtils.enableDynamicNaming('ww.*-moop.com');

      assert.isTrue(MWUtils.dynamicNaming);
      assert.equal(MWUtils.hostPattern, 'ww.*-moop.com');
    });
  });

  describe('#processHeaders', function() {
    var parentId = '74051af127d2bcba';

    it('should return an empty array on an undefined request', function() {
      var headers = MWUtils.processHeaders();

      assert.deepEqual(headers, {});
    });

    it('should return an empty array on an request with an undefined header', function() {
      var req = {};
      var headers = MWUtils.processHeaders(req);

      assert.deepEqual(headers, {});
    });

    it('should return an empty array on an request with an empty header', function() {
      var req = { headers: {}};
      var headers = MWUtils.processHeaders(req);

      assert.deepEqual(headers, {});
    });

    it('should return a split array on an request with an "x-amzn-trace-id" header with a root ID', function() {
      var req = { headers: {}};
      req.headers[XRAY_HEADER] = 'Root=' + traceId;
      var headers = MWUtils.processHeaders(req);

      assert.deepEqual(headers, {Root: traceId});
    });

    it('should return a split array on an request with an "x-amzn-trace-id" header with a root ID and parent ID', function() {
      var req = { headers: {}};
      req.headers[XRAY_HEADER] = 'Root=' + traceId + '; Parent=' + parentId;
      var headers = MWUtils.processHeaders(req);

      assert.deepEqual(headers, {Root: traceId, Parent: parentId});
    });

    it('should return a split array on an request with an "x-amzn-trace-id" header with a root ID, parent ID and sampling', function() {
      var req = { headers: {}};
      req.headers[XRAY_HEADER] = 'Root=' + traceId + '; Parent=' + parentId + '; Sampled=0';
      var headers = MWUtils.processHeaders(req);

      assert.deepEqual(headers, {Root: traceId, Parent: parentId, Sampled: '0'});
    });
  });

  describe('#resolveName', function() {
    beforeEach(function() {
      MWUtils.setDefaultName(defaultName);
    });

    afterEach(function() {
      reloadMWUtils();
    });

    describe('when in fixed mode', function() {
      it('it should use the default name given when there is a host name', function() {
        var name = MWUtils.resolveName(hostName);

        assert.equal(name, defaultName);
      });

      it('it should use the default name given when there is no host name', function() {
        var name = MWUtils.resolveName();

        assert.equal(name, defaultName);
      });
    });

    describe('when in dynamic mode', function() {
      it('it should use the default name when no host is provided', function() {
        MWUtils.enableDynamicNaming();
        var name = MWUtils.resolveName();

        assert.equal(name, defaultName);
      });

      describe('and a host name is provided', function() {
        it('it should use the host name when no pattern is provided', function() {
          MWUtils.enableDynamicNaming();
          var name = MWUtils.resolveName(hostName);

          assert.equal(name, hostName);
        });

        it('it should use the default name when a pattern is provided but not matched', function() {
          MWUtils.enableDynamicNaming('ww.*-moop.com');
          var name = MWUtils.resolveName(hostName);

          assert.equal(name, defaultName);
        });

        it('it should use the host name when a pattern is provided and matched', function() {
          MWUtils.enableDynamicNaming('www.*.com');
          var name = MWUtils.resolveName(hostName);

          assert.equal(name, hostName);
        });
      });
    });
  });

  describe('#resolveSampling', function() {
    var res, sandbox, segment, shouldSampleStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      MWUtils.sampler = localSampler;

      shouldSampleStub = sandbox.stub(MWUtils.sampler, 'shouldSample').returns(true);

      segment = {};
      res = {
        req: {
          headers: { host: 'moop.hello.com' },
          url: '/evergreen',
          method: 'GET',
        },
        header: {}
      };
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should not mark segment as not traced if the sampled header is set to "1"', function() {
      var headers = { Root: traceId, Sampled: '1' };
      MWUtils.resolveSampling(headers, segment, res);

      shouldSampleStub.should.have.not.been.called;

      assert.notProperty(segment, 'notTraced');
    });

    it('should mark segment as not traced if the sampled header is set to "0"', function() {
      var headers = { Root: traceId, Sampled: '0' };
      MWUtils.resolveSampling(headers, segment, res);

      shouldSampleStub.should.have.not.been.called;

      assert.equal(segment.notTraced, true);
    });

    it('should do a sampling rules check if no "Sampled" header is set', function() {
      var headers = { Root: traceId };
      MWUtils.resolveSampling(headers, segment, res);

      var sampleRequest = {
        host: res.req.headers.host,
        httpMethod: res.req.method,
        serviceName: segment.name,
        urlPath: res.req.url
      };

      shouldSampleStub.should.have.been.calledWithExactly(sampleRequest);
    });

    it('should set the response header with sampling result if header is "?"', function() {
      var headers = { Root: traceId, Sampled: '?' };
      MWUtils.resolveSampling(headers, segment, res);

      var expected = new RegExp('^Root=' + traceId + ';Sampled=1$');
      assert.match(res.header[XRAY_HEADER], expected);
    });

    it('should mark segment as not traced if the sampling rules check returns false', function() {
      shouldSampleStub.returns(false);
      var headers = { Root: traceId };

      MWUtils.resolveSampling(headers, segment, res);

      assert.equal(segment.notTraced, true);
    });
  });

  describe('#samplingWildcardMatch', function() {
    var segment = new Segment('foo');
    var headers = {};
    var res = {
      req: {
        headers: {},
        url: '/api/move/up',
        method: 'GET',
      },
      header: {}
    };

    var customRules = {
      version: 2,
      rules: [
        {
          description: 'Player moves.',
          host: '*',
          http_method: '*',
          url_path: '/api/move/*',
          fixed_target: 0,
          rate: 1
        }
      ],
      default: {
        fixed_target: 0,
        rate: 0
      }
    };

    it('should match path based sampling rule if host name is not present in the headers', function() {
      MWUtils.setSamplingRules(customRules);
      MWUtils.resolveSampling(headers, segment, res);
      assert.notProperty(segment, 'notTraced');
    });
  });

  describe('#setDefaultName', function() {
    it('it should set the default name', function() {
      MWUtils.setDefaultName(defaultName);

      assert.equal(MWUtils.defaultName, defaultName);
    });

    it('it should be overidden by the default name set as an environment variable', function() {
      process.env.AWS_XRAY_TRACING_NAME = envVarName;
      reloadMWUtils();
      MWUtils.setDefaultName(defaultName);

      assert.equal(MWUtils.defaultName, envVarName);
    });
  });

  describe('#setSamplingRules', function() {
    var samplerStub, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      samplerStub = sandbox.stub(MWUtils.sampler, 'setLocalRules');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should accept a string for location', function() {
      var location = '/path/here';
      MWUtils.setSamplingRules(location);
      samplerStub.should.have.been.calledWith(location);
    });

    it('should accept a source object', function() {
      var source = {};
      MWUtils.setSamplingRules(source);
      samplerStub.should.have.been.calledWith(source);
    });

    it('should throw an error on bad values', function() {
      assert.throws(function() { MWUtils.setSamplingRules(); });
      assert.throws(function() { MWUtils.setSamplingRules(null); });
      assert.throws(function() { MWUtils.setSamplingRules(0); });
      assert.throws(function() { MWUtils.setSamplingRules(new String('')); });
    });
  });
});
