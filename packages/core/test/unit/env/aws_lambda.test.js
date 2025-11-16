var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.should();
chai.use(sinonChai);

var contextUtils = require('../../../lib/context_utils');
var mwUtils = require('../../../lib/middleware/mw_utils');
var Lambda = require('../../../lib/env/aws_lambda');
var LambdaUtils = require('../../../lib/utils').LambdaUtils;
var Segment = require('../../../lib/segments/segment');
var SegmentUtils = require('../../../lib/segments/segment_utils');
var SegmentEmitter = require('../../../lib/segment_emitter');
const TraceID = require('../../../lib/segments/attributes/trace_id');

describe('AWSLambda', function () {
  var sandbox;

  function resetState() {
    delete require.cache[require.resolve('../../../lib/context_utils')];
    contextUtils = require('../../../lib/context_utils');

    var path = '../../../lib/env/aws_lambda';
    delete require.cache[require.resolve(path)];
    Lambda = require(path);
  }

  beforeEach(function () {
    resetState();

    sandbox = sinon.createSandbox();
    sandbox.stub(contextUtils, 'getNamespace').returns({
      enter: function () { },
      createContext: function () { }
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('#init', function () {
    var disableReusableSocketStub, disableCentralizedSamplingStub, populateStub, sandbox, setSegmentStub, validateStub;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      disableReusableSocketStub = sandbox.stub(SegmentEmitter, 'disableReusableSocket');
      disableCentralizedSamplingStub = sandbox.stub(mwUtils, 'disableCentralizedSampling');
      validateStub = sandbox.stub(LambdaUtils, 'validTraceData').returns(true);
      populateStub = sandbox.stub(LambdaUtils, 'populateTraceData').returns(true);
      setSegmentStub = sandbox.stub(contextUtils, 'setSegment');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should disable reusable socket', function () {
      Lambda.init();
      disableReusableSocketStub.should.have.been.calledOnce;
    });

    it('should disable centralized sampling', function () {
      Lambda.init();
      disableCentralizedSamplingStub.should.have.been.calledOnce;
    });

    it('should override the default streaming threshold', function () {
      Lambda.init();
      assert.equal(SegmentUtils.streamingThreshold, 0);
    });

    it('should set a facade segment on the context', function () {
      Lambda.init();
      setSegmentStub.should.have.been.calledOnce;
      setSegmentStub.should.have.been.calledWith(sinon.match.instanceOf(Segment));

      var facade = setSegmentStub.args[0][0];
      assert.equal(facade.name, 'facade');
      assert.equal(facade.trace_id, TraceID.Invalid().toString());
    });

    describe('the facade segment', function () {
      afterEach(function () {
        populateStub.returns(true);
        delete process.env._X_AMZN_TRACE_ID;
        validateStub.reset();
      });

      it('should call validTraceData with process.env._X_AMZN_TRACE_ID', function () {
        process.env._X_AMZN_TRACE_ID;
        Lambda.init();

        validateStub.should.have.been.calledWith(process.env._X_AMZN_TRACE_ID);
      });

      it('should call populateTraceData if validTraceData returns true', function () {
        Lambda.init();

        populateStub.should.have.been.calledOnce;
      });

      it('should not call populateTraceData if validTraceData returns false', function () {
        validateStub.returns(false);
        Lambda.init();

        populateStub.should.have.not.been.called;
      });
    });
  });

  describe('FacadeSegment', function () {
    var populateStub, setSegmentStub;

    beforeEach(function () {
      sandbox.stub(SegmentEmitter, 'disableReusableSocket');

      sandbox.stub(LambdaUtils, 'validTraceData').returns(true);
      populateStub = sandbox.stub(LambdaUtils, 'populateTraceData').returns(true);
      setSegmentStub = sandbox.stub(contextUtils, 'setSegment');
    });

    afterEach(function () {
      delete process.env._X_AMZN_TRACE_ID;
    });

    describe('#reset', function () {
      it('should check reset the facade', function () {
        Lambda.init();

        var facade = setSegmentStub.args[0][0];
        facade.trace_id = 'traceIdHere';
        facade.id = 'parentIdHere';
        facade.subsegments = [{ subsegment: 'here' }];

        facade.reset();

        assert.isNotNull(facade.trace_id);
        assert.isNotNull(facade.id);
        assert.isUndefined(facade.subsegments);
        assert.isTrue(facade.notTraced);
      });
    });

    describe('#resolveLambdaTraceData', function () {
      var traceId;
      var INVOKE_STORE_TRACE_ID = 'Root=1-12345678-12345678901234567890abcd;Parent=abcdef0123456789;Sampled=1';
      var ENV_TRACE_ID = 'Root=1-87654321-09876543210987654321dcba;Parent=fedcba9876543210;Sampled=0';

      beforeEach(function () {
        traceId = 'xAmznTraceId;xAmznTraceId;xAmznTraceId';
      });

      afterEach(function () {
        delete globalThis.awslambda;
      });

      it('should throw an error if _X_AMZN_TRACE_ID is not set', function () {
        Lambda.init();
        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        assert.throws(facade.resolveLambdaTraceData);
        populateStub.should.have.not.been.called;
      });

      it('should call populate if _X_AMZN_TRACE_ID has changed post init', function () {
        process.env._X_AMZN_TRACE_ID = traceId;
        Lambda.init();
        process.env._X_AMZN_TRACE_ID = 'xAmznTraceId2';
        populateStub.reset();
        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();

        populateStub.should.have.been.calledOnce;
      });

      it('should call reset if _X_AMZN_TRACE_ID has changed post init', function () {
        process.env._X_AMZN_TRACE_ID = traceId;
        Lambda.init();
        process.env._X_AMZN_TRACE_ID = 'xAmznTraceId2';
        var facade = setSegmentStub.args[0][0];
        var resetStub = sandbox.stub(facade, 'reset');

        facade.resolveLambdaTraceData();
        resetStub.should.have.been.calledOnce;
      });

      it('should not call populate if _X_AMZN_TRACE_ID is the same post init', function () {
        process.env._X_AMZN_TRACE_ID = traceId;
        Lambda.init();
        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();
        populateStub.should.have.not.been.called;
      });

      async function setupInvokeStore() {
        let invokeStore = (await import("@aws/lambda-invoke-store")).InvokeStore;
        const testing = invokeStore._testing;
        if (testing) {
          testing.reset();
        } else {
          throw "testing needs to be defined";
        }
        return await invokeStore.getInstanceAsync();
      }

      it('should prioritize InvokeStore trace ID over environment variable if both are defined', async function () {
        process.env._X_AMZN_TRACE_ID = ENV_TRACE_ID;
        process.env.AWS_LAMBDA_BENCHMARK_MODE = "1";
        process.env.AWS_LAMBDA_MAX_CONCURRENCY = 2;
        Lambda.init();
        const invokeStore = await setupInvokeStore();
      
        const getXRayTraceIdStub = sandbox.stub(invokeStore, 'getXRayTraceId').returns(INVOKE_STORE_TRACE_ID);

        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();

        getXRayTraceIdStub.should.have.been.calledOnce;
        populateStub.should.have.been.calledWith(facade, INVOKE_STORE_TRACE_ID);
      });

      it('should use InvokeStore trace ID when environment variable is undefined', async function () {
        delete process.env._X_AMZN_TRACE_ID;
        process.env.AWS_LAMBDA_BENCHMARK_MODE = "1";
        process.env.AWS_LAMBDA_MAX_CONCURRENCY = 2;
        Lambda.init();
        const invokeStore = await setupInvokeStore();
        const getXRayTraceIdStub = sandbox.stub(invokeStore, 'getXRayTraceId').returns(INVOKE_STORE_TRACE_ID);

        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();

        getXRayTraceIdStub.should.have.been.calledOnce;
        populateStub.should.have.been.calledWith(facade, INVOKE_STORE_TRACE_ID);
      });

      it('should use environment variable when InvokeStore returns undefined', async function () {
        process.env.AWS_LAMBDA_BENCHMARK_MODE = "1";
        process.env.AWS_LAMBDA_MAX_CONCURRENCY = 2;
        Lambda.init();
        
        const invokeStore = await setupInvokeStore();
        const getXRayTraceIdStub = sandbox.stub(invokeStore, 'getXRayTraceId').returns(undefined);

        // Set the environment variable after init so it's treated as a new trace ID
        process.env._X_AMZN_TRACE_ID = ENV_TRACE_ID;
        
        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();

        getXRayTraceIdStub.should.have.been.calledOnce;
        populateStub.should.have.been.calledOnce;
        populateStub.should.have.been.calledWith(facade, ENV_TRACE_ID);
      });
    });
  });

  describe('PopulateAdditionalTraceData', function () {
    var setSegmentStub;

    beforeEach(function () {
      sandbox.stub(SegmentEmitter, 'disableReusableSocket');
      sandbox.stub(LambdaUtils, 'validTraceData').returns(true);

      setSegmentStub = sandbox.stub(contextUtils, 'setSegment');
    });

    afterEach(function () {
      delete process.env._X_AMZN_TRACE_ID;
      delete globalThis.awslambda;
    });

    async function setupInvokeStore() {
      let invokeStore = (await import("@aws/lambda-invoke-store")).InvokeStore;
      const testing = invokeStore._testing;
      if (testing) {
        testing.reset();
      } else {
        throw "testing needs to be defined";
      }
      return await invokeStore.getInstanceAsync();
    }

    it('should populate additional trace data', async function () {
      process.env._X_AMZN_TRACE_ID = 'Root=traceId;Lineage=1234abcd:4|3456abcd:6';
      process.env.AWS_LAMBDA_BENCHMARK_MODE = "1";
      Lambda.init();
      await setupInvokeStore();

      var facade = setSegmentStub.args[0][0];
      facade.resolveLambdaTraceData();
      var additionalTraceData = facade.additionalTraceData;
      assert.equal(additionalTraceData['Lineage'], '1234abcd:4|3456abcd:6');
    });
  });
});
