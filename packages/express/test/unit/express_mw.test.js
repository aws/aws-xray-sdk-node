var xray = require('aws-xray-sdk-core');
var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var expressMW = require('../../lib/express_mw');
var SegmentEmitter = require('../../../core/lib/segment_emitter.js');
var ServiceConnector = require('../../../core/lib/middleware/sampling/service_connector.js');

var mwUtils = xray.middleware;
var IncomingRequestData = xray.middleware.IncomingRequestData;
var Segment = xray.Segment;

chai.should();
chai.use(sinonChai);

var utils = require('../test_utils');

describe('Express middleware', function() {
  var defaultName = 'defaultName';
  var hostName = 'expressMiddlewareTest';
  var parentId = '2c7ad569f5d6ff149137be86';
  var traceId = '1-f9194208-2c7ad569f5d6ff149137be86';

  describe('#openSegment', function() {
    var openSegment = expressMW.openSegment;

    it('should throw an error if no default name is supplied', function() {
      assert.throws(openSegment);
    });

    it('should return a middleware function', function() {
      assert.isFunction(openSegment(defaultName));
    });
  });

  describe('#open', function() {
    var req, res, sandbox;
    var open = expressMW.openSegment(defaultName);

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(xray, 'isAutomaticMode').returns(false);

      req = {
        method: 'GET',
        url: '/',
        connection: {
          remoteAddress: 'localhost'
        },
        headers: { host: 'myHostName' }
      };

      req.emitter = new utils.TestEmitter();
      req.on = utils.onEvent;

      res = {
        req: req,
        header: {}
      };
      res.emitter = new utils.TestEmitter();
      res.on = utils.onEvent;
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('when handling a request', function() {
      var addReqDataSpy, newSegmentSpy, onEventStub, processHeadersStub, resolveNameStub, sandbox;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        newSegmentSpy = sandbox.spy(Segment.prototype, 'init');
        addReqDataSpy = sandbox.spy(Segment.prototype, 'addIncomingRequestData');

        onEventStub = sandbox.stub(res, 'on');

        processHeadersStub = sandbox.stub(mwUtils, 'processHeaders').returns({ Root: traceId, Parent: parentId, Sampled: '0' });
        resolveNameStub = sandbox.stub(mwUtils, 'resolveName').returns(defaultName);

        req.headers = { host: hostName };
      });

      afterEach(function() {
        sandbox.restore();
        delete process.env.AWS_XRAY_TRACING_NAME;
      });

      it('should call mwUtils.processHeaders to split the headers, if any', function() {
        open(req, res);

        processHeadersStub.should.have.been.calledOnce;
        processHeadersStub.should.have.been.calledWithExactly(req);
      });

      it('should call mwUtils.resolveName to find the name of the segment', function() {
        open(req, res);

        resolveNameStub.should.have.been.calledOnce;
        resolveNameStub.should.have.been.calledWithExactly(req.headers.host);
      });

      it('should create a new segment', function() {
        open(req, res);

        newSegmentSpy.should.have.been.calledOnce;
        newSegmentSpy.should.have.been.calledWithExactly(defaultName, traceId, parentId);
      });

      it('should add a new http property on the segment', function() {
        open(req, res);

        addReqDataSpy.should.have.been.calledOnce;
        addReqDataSpy.should.have.been.calledWithExactly(sinon.match.instanceOf(IncomingRequestData));
      });

      it('should add a finish and close event to the response', function() {
        open(req, res);

        onEventStub.should.have.been.calledTwice;
        onEventStub.should.have.been.calledWithExactly('finish', sinon.match.typeOf('function'));
        onEventStub.should.have.been.calledWithExactly('close', sinon.match.typeOf('function'));
      });
    });

    describe('when the request completes', function() {
      var sandbox;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        sandbox.stub(SegmentEmitter);
        sandbox.stub(ServiceConnector);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should add the error flag on the segment on 4xx', function() {
        var getCauseStub = sandbox.stub(xray.utils, 'getCauseTypeFromHttpStatus').returns('error');
        open(req, res);

        res.statusCode = 400;
        res.emitter.emit('finish');

        assert.equal(req.segment.error, true);
        getCauseStub.should.have.been.calledWith(400);
      });

      it('should add the fault flag on the segment on 5xx', function() {
        var getCauseStub = sandbox.stub(xray.utils, 'getCauseTypeFromHttpStatus').returns('fault');
        open(req, res);

        res.statusCode = 500;
        res.emitter.emit('finish');

        assert.equal(req.segment.fault, true);
        getCauseStub.should.have.been.calledWith(500);
      });

      it('should add the throttle flag and error flag on the segment on a 429', function() {
        open(req, res);

        res.statusCode = 429;
        res.emitter.emit('finish');

        assert.equal(req.segment.throttle, true);
        assert.equal(req.segment.error, true);
      });

      it('should add nothing on anything else', function() {
        open(req, res);

        res.statusCode = 200;
        res.emitter.emit('finish');

        assert.notProperty(req.segment, 'error');
        assert.notProperty(req.segment, 'fault');
        assert.notProperty(req.segment, 'throttle');
      });
    });
  });
});
