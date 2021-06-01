var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var xray = require('aws-xray-sdk-core');

var TestEmitter = require('../test_utils').TestEmitter;

var restifyMW = require('../../lib/restify_mw');
var SegmentEmitter = require('../../../core/dist/lib/segment_emitter.js');
var ServiceConnector = require('../../../core/dist/lib/middleware/sampling/service_connector.js');

var mwUtils = xray.middleware;
var IncomingRequestData = xray.middleware.IncomingRequestData;
var Segment = xray.Segment;

chai.should();
chai.use(sinonChai);

var utils = require('../test_utils');

describe('Restify middleware', function() {
  var sandbox, server;
  var defaultName = 'defaultName';
  var hostName = 'expressMiddlewareTest';
  var parentId = '2c7ad569f5d6ff149137be86';
  var traceId = '1-f9194208-2c7ad569f5d6ff149137be86';

  beforeEach(function() {
    server = new TestEmitter();
    server.use = function(fcn) {
      this.open = fcn;
    };
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#enable', function() {
    var enable = restifyMW.enable;

    it('should throw an error if no restify instance is supplied', function() {
      assert.throws(enable);
    });

    it('should throw an error if no default name is supplied', function() {
      assert.throws(function() {
        enable(server);
      });
    });

    it('should make restify use the open function and set listeners on "uncaughtException" and "after" events', function() {
      var serverMock = sandbox.mock(server);
      serverMock.expects('use').withArgs(sinon.match.func);
      serverMock.expects('on').once().withArgs('after', sinon.match.func);
      serverMock.expects('on').once().withArgs('uncaughtException', sinon.match.func);

      enable(server, defaultName);

      serverMock.verify();
    });
  });

  describe('#open', function() {
    var req, res, modeStub, sandbox, setStub;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      modeStub = sandbox.stub(xray, 'isAutomaticMode').returns(true);
      setStub = sandbox.stub(xray, 'setSegment');

      var ns = {
        bindEmitter: function() {},
        run: function(fcn) {
          fcn();
        }
      };
      sandbox.stub(xray, 'getNamespace').returns(ns);

      req = {
        method: 'GET',
        url: '/',
        connection: {
          remoteAddress: 'localhost'
        },
        headers: { host: 'myHostName' },
        context: {},
      };

      req.emitter = new utils.TestEmitter();
      req.on = utils.onEvent;

      res = {
        req: req,
        header: {}
      };
      res.emitter = new utils.TestEmitter();
      res.on = utils.onEvent;

      restifyMW.enable(server, defaultName);
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('when handling a request', function() {
      var addReqDataSpy, newSegmentSpy, onEventStub, processHeadersStub, resolveNameStub, sandbox;

      beforeEach(function() {
        sandbox = sinon.createSandbox();
        newSegmentSpy = sandbox.spy(Segment.prototype, 'init');
        addReqDataSpy = sandbox.spy(Segment.prototype, 'addIncomingRequestData');

        onEventStub = sandbox.stub(res, 'on');

        processHeadersStub = sandbox.stub(mwUtils, 'processHeaders').returns({ root: traceId, parent: parentId, sampled: '0' });
        resolveNameStub = sandbox.stub(mwUtils, 'resolveName').returns(defaultName);

        req.headers = { host: hostName };
      });

      afterEach(function() {
        sandbox.restore();
        delete process.env.AWS_XRAY_TRACING_NAME;
      });

      it('should call mwUtils.processHeaders to split the headers, if any', function() {
        server.open(req, res);

        processHeadersStub.should.have.been.calledOnce;
        processHeadersStub.should.have.been.calledWithExactly(req);
      });

      it('should call mwUtils.resolveName to find the name of the segment', function() {
        server.open(req, res);

        resolveNameStub.should.have.been.calledOnce;
        resolveNameStub.should.have.been.calledWithExactly(req.headers.host);
      });

      it('should create a new segment', function() {
        server.open(req, res);

        newSegmentSpy.should.have.been.calledOnce;
        newSegmentSpy.should.have.been.calledWithExactly(defaultName, traceId, parentId);
      });

      it('should add a new http property on the segment', function() {
        server.open(req, res);

        addReqDataSpy.should.have.been.calledOnce;
        addReqDataSpy.should.have.been.calledWithExactly(sinon.match.instanceOf(IncomingRequestData));
      });

      it('should add a finish event to the response', function() {
        server.open(req, res);

        onEventStub.should.have.been.calledWithExactly('finish', sinon.match.typeOf('function'));
      });

      it('should add a close event to the response', function() {
        server.open(req, res);

        onEventStub.should.have.been.calledWithExactly('close', sinon.match.typeOf('function'));
      });

      describe('in automatic mode', function() {
        it('should set the segment on the namespace if in automatic mode', function() {
          server.open(req, res);

          setStub.should.have.been.calledWith(sinon.match.instanceOf(Segment));
        });
      });

      describe('in manual mode', function() {
        it('should set the segment on the request object if in manual mode', function() {
          modeStub.returns(false);
          server.open(req, res);

          assert.instanceOf(req.segment, Segment);
        });

        it('should set the segment on the restify context if in manual mode (and available)', function() {
          modeStub.returns(false);
          req.set = function() {};
          var reqSetStub = sandbox.stub(req, 'set');
          server.open(req, res);

          reqSetStub.should.have.been.calledWith('XRaySegment', sinon.match.instanceOf(Segment));
        });
      });

      it('should add a finish event to the response', function() {
        server.open(req, res);

        onEventStub.should.have.been.calledWithExactly('finish', sinon.match.typeOf('function'));
      });

      it('should add a close event to the response', function() {
        server.open(req, res);

        onEventStub.should.have.been.calledWithExactly('close', sinon.match.typeOf('function'));
      });
    });

    describe('when the request completes', function() {
      var sandbox;

      beforeEach(function() {
        sandbox = sinon.createSandbox();
        sandbox.stub(SegmentEmitter);
        sandbox.stub(ServiceConnector);

        modeStub.returns(false);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should add the error flag the segment on 4xx', function() {
        var getCauseStub = sandbox.stub(xray.utils, 'getCauseTypeFromHttpStatus').returns('error');
        server.open(req, res);

        res.statusCode = 400;
        res.emitter.emit('finish');

        assert.equal(req.segment.error, true);
        getCauseStub.should.have.been.calledWith(400);
      });

      it('should add the fault flag the segment on 5xx', function() {
        var getCauseStub = sandbox.stub(xray.utils, 'getCauseTypeFromHttpStatus').returns('fault');
        server.open(req, res);

        res.statusCode = 500;
        res.emitter.emit('finish');

        assert.equal(req.segment.fault, true);
        getCauseStub.should.have.been.calledWith(500);
      });

      it('should add the throttle flag and error flag on the segment on a 429', function() {
        var getCauseStub = sandbox.stub(xray.utils, 'getCauseTypeFromHttpStatus').returns('error');
        server.open(req, res);

        res.statusCode = 429;
        res.emitter.emit('finish');

        assert.equal(req.segment.throttle, true);
        getCauseStub.should.have.been.calledWith(429);
      });

      it('should add nothing on anything else', function() {
        server.open(req, res);

        res.statusCode = 200;
        res.emitter.emit('finish');

        var segment = req.segment;

        assert.notProperty(segment, 'error');
        assert.notProperty(segment, 'fault');
        assert.notProperty(segment, 'throttle');
      });
    });
  });
});
