const xray = require('aws-xray-sdk-core');
const assert = require('chai').assert;
const chai = require('chai');
const sinon = require('sinon').createSandbox();
const sinonChai = require('sinon-chai');

const { openSegment } = require('../../lib/koa_mw');
const SegmentEmitter = require('aws-xray-sdk-core/dist/lib/segment_emitter.js');
const ServiceConnector = require('aws-xray-sdk-core/dist/lib/middleware/sampling/service_connector.js');

const mwUtils = xray.middleware;
const IncomingRequestData = xray.middleware.IncomingRequestData;
const Segment = xray.Segment;

chai.should();
chai.use(sinonChai);

const utils = require('../test_utils');

describe('Koa middleware', function () {
  const defaultName = 'defaultName';
  const hostName = 'koaMiddlewareTest';
  const parentId = '2c7ad569f5d6ff149137be86';
  const traceId = '1-f9194208-2c7ad569f5d6ff149137be86';

  describe('#openSegment', function () {
    it('should throw an error if no default name is supplied', function () {
      assert.throws(() => openSegment());
    });

    it('should return a middleware function', function () {
      assert.isFunction(openSegment(defaultName));
    });
  });

  describe('#open', function () {
    let ctx, req, res;
    let open;

    before(function () {
      open = openSegment(defaultName);
    });

    beforeEach(function () {
      sinon.stub(xray, 'isAutomaticMode').returns(false);

      req = {
        method: 'GET',
        url: '/',
        connection: {
          remoteAddress: 'localhost',
        },
        headers: { host: 'myHostName' },
      };

      req.emitter = new utils.TestEmitter();
      req.on = utils.onEvent;

      res = {
        req: req,
        header: {},
      };
      res.emitter = new utils.TestEmitter();
      res.on = utils.onEvent;
      ctx = {
        req,
        res,
        status: 200,
        headers: req.headers,
        url: req.url,
        host: req.headers.host,
        hostName: req.headers.host,
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    describe('when handling a request', function () {
      let addReqDataSpy, newSegmentSpy, processHeadersStub, resolveNameStub;

      beforeEach(function () {
        newSegmentSpy = sinon.spy(Segment.prototype, 'init');
        addReqDataSpy = sinon.spy(Segment.prototype, 'addIncomingRequestData');

        processHeadersStub = sinon
          .stub(mwUtils, 'processHeaders')
          .returns({ root: traceId, parent: parentId, sampled: '0' });
        resolveNameStub = sinon
          .stub(mwUtils, 'resolveName')
          .returns(defaultName);

        req.headers = { host: hostName };
      });

      afterEach(function () {
        sinon.restore();
        delete process.env.AWS_XRAY_TRACING_NAME;
      });

      it('should call mwUtils.processHeaders to split the headers, if any', function () {
        open(ctx);

        processHeadersStub.should.have.been.calledOnce;
        processHeadersStub.should.have.been.calledWithExactly(ctx);
      });

      it('should call mwUtils.resolveName to find the name of the segment', function () {
        open(ctx);

        resolveNameStub.should.have.been.calledOnce;
        resolveNameStub.should.have.been.calledWithExactly(ctx.headers.host);
      });

      it('should create a new segment', function () {
        open(ctx);

        newSegmentSpy.should.have.been.calledOnce;
        newSegmentSpy.should.have.been.calledWithExactly(
          defaultName,
          traceId,
          parentId
        );
      });

      it('should add a new http property on the segment', function () {
        open(ctx);

        addReqDataSpy.should.have.been.calledOnce;
        addReqDataSpy.should.have.been.calledWithExactly(
          sinon.match.instanceOf(IncomingRequestData)
        );
      });
    });

    describe('when the request completes', function () {
      beforeEach(function () {
        sinon.stub(SegmentEmitter);
        sinon.stub(ServiceConnector);
      });

      afterEach(function () {
        sinon.restore();
      });

      it('should add the error flag on the segment on 4xx', function () {
        const getCauseStub = sinon
          .stub(xray.utils, 'getCauseTypeFromHttpStatus')
          .returns('error');
        res.statusCode = 400;
        ctx.status = 400;
        open(ctx);

        assert.equal(ctx.segment.error, true);
        getCauseStub.should.have.been.calledWith(400);
      });

      it('should add the fault flag on the segment on 5xx', function () {
        const getCauseStub = sinon
          .stub(xray.utils, 'getCauseTypeFromHttpStatus')
          .returns('fault');
        res.statusCode = 500;
        ctx.status = 500;
        open(ctx);

        assert.equal(ctx.segment.fault, true);
        getCauseStub.should.have.been.calledWith(500);
      });

      it('should add the throttle flag and error flag on the segment on a 429', function () {
        res.statusCode = 429;
        ctx.status = 429;
        open(ctx);

        assert.equal(ctx.segment.throttle, true);
        assert.equal(ctx.segment.error, true);
      });

      it('should add nothing on anything else', function () {
        res.statusCode = 200;
        ctx.status = 200;
        open(ctx);

        assert.notProperty(ctx.segment, 'error');
        assert.notProperty(ctx.segment, 'fault');
        assert.notProperty(ctx.segment, 'throttle');
      });
    });
  });
});
