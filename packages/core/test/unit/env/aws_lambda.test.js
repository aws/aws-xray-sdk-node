var assert = require('chai').assert;
var chai = require('chai');
var fs = require('fs');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var contextUtils = require('../../../lib/context_utils');
var Lambda = require('../../../lib/env/aws_lambda');
var LambdaUtils = require('../../../lib/utils').LambdaUtils;
var Segment = require('../../../lib/segments/segment');
var SegmentUtils = require('../../../lib/segments/segment_utils');
var SegmentEmitter = require('../../../lib/segment_emitter');

describe('AWSLambda', function() {
  var sandbox;

  function resetState() {
    delete require.cache[require.resolve('../../../lib/context_utils')];
    contextUtils = require('../../../lib/context_utils');

    var path = '../../../lib/env/aws_lambda';
    delete require.cache[require.resolve(path)];
    Lambda = require(path);
  }

  beforeEach(function() {
    resetState();

    sandbox = sinon.sandbox.create();
    sandbox.stub(contextUtils, 'getNamespace').returns({
      enter: function() {},
      createContext: function() {}
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#init', function() {
    var disableReusableSocketStub, openSyncStub, populateStub, sandbox, setSegmentStub, validateStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      disableReusableSocketStub = sandbox.stub(SegmentEmitter, 'disableReusableSocket');
      openSyncStub = sandbox.stub(fs, 'openSync');
      sandbox.stub(fs, 'mkdir').yields();
      sandbox.stub(fs, 'closeSync');
      sandbox.stub(fs, 'utimesSync');

      validateStub = sandbox.stub(LambdaUtils, 'validTraceData').returns(true);
      populateStub = sandbox.stub(LambdaUtils, 'populateTraceData').returns(true);
      setSegmentStub = sandbox.stub(contextUtils, 'setSegment');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should create the AWS XRay init file', function() {
      Lambda.init();
      openSyncStub.should.have.been.calledOnce;
    });

    it('should disable reusable socket', function() {
      Lambda.init();
      disableReusableSocketStub.should.have.been.calledOnce;
    });

    it('should override the default streaming threshold', function() {
      Lambda.init();
      assert.equal(SegmentUtils.streamingThreshold, 0);
    });

    it('should set a facade segment on the context', function() {
      Lambda.init();
      setSegmentStub.should.have.been.calledOnce;
      setSegmentStub.should.have.been.calledWith(sinon.match.instanceOf(Segment));

      var facade = setSegmentStub.args[0][0];
      assert.equal(facade.name, 'facade');
    });

    describe('the facade segment', function() {
      afterEach(function() {
        populateStub.returns(true);
        delete process.env._X_AMZN_TRACE_ID;
        validateStub.reset();
      });

      it('should call validTraceData with process.env._X_AMZN_TRACE_ID', function() {
        process.env._X_AMZN_TRACE_ID;
        Lambda.init();

        validateStub.should.have.been.calledWith(process.env._X_AMZN_TRACE_ID);
      });

      it('should call populateTraceData if validTraceData returns true', function() {
        Lambda.init();

        populateStub.should.have.been.calledOnce;
      });

      it('should not call populateTraceData if validTraceData returns false', function() {
        validateStub.returns(false);
        Lambda.init();

        populateStub.should.have.not.been.called;
      });
    });
  });

  describe('FacadeSegment', function() {
    var populateStub, sandbox, setSegmentStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(SegmentEmitter, 'disableReusableSocket');
      sandbox.stub(fs, 'openSync');
      sandbox.stub(fs, 'mkdir').yields();
      sandbox.stub(fs, 'closeSync');
      sandbox.stub(fs, 'utimesSync');

      sandbox.stub(LambdaUtils, 'validTraceData').returns(true);
      populateStub = sandbox.stub(LambdaUtils, 'populateTraceData').returns(true);
      setSegmentStub = sandbox.stub(contextUtils, 'setSegment');
    });

    afterEach(function() {
      delete process.env._X_AMZN_TRACE_ID;
      sandbox.restore();
    });

    describe('#reset', function() {
      it('should check reset the facade', function() {
        Lambda.init();

        var facade = setSegmentStub.args[0][0];
        facade.trace_id = 'traceIdHere';
        facade.id = 'parentIdHere';
        facade.subsegments = [ { subsegment: 'here' } ];
        facade.trace_id = 'traceIdHere';

        facade.reset();

        assert.isNull(facade.trace_id);
        assert.isNull(facade.id);
        assert.isUndefined(facade.subsegments);
        assert.isTrue(facade.notTraced);
      });
    });

    describe('#resolveLambdaTraceData', function() {
      var sandbox, traceId;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        traceId = 'xAmznTraceId;xAmznTraceId;xAmznTraceId';
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should throw an error if _X_AMZN_TRACE_ID is not set', function() {
        Lambda.init();
        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        assert.throws(facade.resolveLambdaTraceData);
        populateStub.should.have.not.been.called;
      });

      it('should call populate if _X_AMZN_TRACE_ID has changed post init', function() {
        process.env._X_AMZN_TRACE_ID = traceId;
        Lambda.init();
        process.env._X_AMZN_TRACE_ID = 'xAmznTraceId2';
        populateStub.reset();
        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();

        populateStub.should.have.been.calledOnce;
      });

      it('should call reset if _X_AMZN_TRACE_ID has changed post init', function() {
        process.env._X_AMZN_TRACE_ID = traceId;
        Lambda.init();
        process.env._X_AMZN_TRACE_ID = 'xAmznTraceId2';
        var facade = setSegmentStub.args[0][0];
        var resetStub = sandbox.stub(facade, 'reset');

        facade.resolveLambdaTraceData();
        resetStub.should.have.been.calledOnce;
      });

      it('should not call populate if _X_AMZN_TRACE_ID is the same post init', function() {
        process.env._X_AMZN_TRACE_ID = traceId;
        Lambda.init();
        populateStub.reset();

        var facade = setSegmentStub.args[0][0];
        facade.resolveLambdaTraceData();
        populateStub.should.have.not.been.called;
      });
    });
  });
});
