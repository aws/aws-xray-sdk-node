const xray = require('aws-xray-sdk-core');
const chai = require('chai');
const sinon = require('sinon').createSandbox();
const sinonChai = require('sinon-chai');
const { assert } = chai;

const xrayPlugin = require('../../lib/plugin');
const fastifyXray = require('../../lib/xray');
const SegmentEmitter = require('aws-xray-sdk-core/dist/lib/segment_emitter.js');
const ServiceConnector = require('aws-xray-sdk-core/dist/lib/middleware/sampling/service_connector.js');

const mwUtils = xray.middleware;
const IncomingRequestData = xray.middleware.IncomingRequestData;
const Segment = xray.Segment;

chai.should();
chai.use(sinonChai);

describe('Fastify plugin', function () {
  const defaultName = 'defaultName';
  const hostName = 'fastifyMiddlewareTest';
  const parentId = '2c7ad569f5d6ff149137be86';
  const traceId = '1-f9194208-2c7ad569f5d6ff149137be86';

  afterEach(function () {
    sinon.restore();
  });

  describe('#plugin', function () {
    it('should set up xray with options specified in the plugin', function () {
      this.timeout(3000); //On rare occasion this test times out...adding more time
      const testLogger = { error: () => 'error', debug: () => 'debug' };
      const captureAwsSpy = sinon.spy(xray, 'captureAWS');
      const captureHttpSpy = sinon.spy(xray, 'captureHTTPsGlobal');
      const capturePromiseSpy = sinon.spy(xray, 'capturePromise');

      xrayPlugin.register(
        { ext: () => 'test', events: { on: () => 'test' } },
        {
          segmentName: 'test segment',
          captureAWS: true,
          captureHTTP: true,
          capturePromises: true,
          logger: testLogger,
        }
      );
      assert.equal(xray.getLogger(), testLogger);
      assert.equal(mwUtils.defaultName, 'test segment');
      assert.equal(captureAwsSpy.callCount, 1);
      assert.equal(captureHttpSpy.callCount, 2);
      assert.equal(capturePromiseSpy.callCount, 1);
    });
  });

  describe('#setup', function () {
    it('should set the default segment name on xray', function () {
      fastifyXray.setup({ segmentName: 'test segment' });
      assert.equal(mwUtils.defaultName, 'test segment');
    });

    it('should generate the default segment name on xray', function () {
      fastifyXray.setup({});
      assert.isTrue(mwUtils.defaultName.includes('aws-xray-sdk-fastify'));
    });

    it('should be set to automatic mode by default on xray', function () {
      fastifyXray.setup({});
      assert.equal(xray.isAutomaticMode(), true);
    });

    it('should set automatic mode on xray', function () {
      fastifyXray.setup({ automaticMode: false });
      assert.equal(xray.isAutomaticMode(), false);
    });

    it('should set the passed logger', function () {
      const testLogger = { error: () => 'error', debug: () => 'debug' };
      fastifyXray.setup({ logger: testLogger });
      assert.equal(xray.getLogger(), testLogger);
    });

    it('should call captureAWS when captureAWS is true', function () {
      const captureSpy = sinon.spy(xray, 'captureAWS');
      fastifyXray.setup({ captureAWS: true });
      assert.equal(captureSpy.callCount, 1);
    });

    it('should set plugins when provided', function () {
      const pluginSpy = sinon.spy(xray.plugins.ECSPlugin, 'getData');
      fastifyXray.setup({ plugins: [xray.plugins.ECSPlugin] });
      assert.equal(pluginSpy.callCount, 1);
    });

    it('should call captureHTTPsGlobal when captureHttp is true', function () {
      const captureSpy = sinon.spy(xray, 'captureHTTPsGlobal');
      fastifyXray.setup({ captureHTTP: true });
      assert.equal(captureSpy.callCount, 2);
    });

    it('should call capturePromise when capturePromises is true', function () {
      const captureSpy = sinon.spy(xray, 'capturePromise');
      fastifyXray.setup({ capturePromises: true });
      assert.equal(captureSpy.callCount, 1);
    });
  });

  describe('#createRequestHandler', function () {
    let request, req, res;
    const h = {
      continue: () => Promise.resolve('blah'),
    };

    beforeEach(function () {
      req = {
        method: 'GET',
        url: '/',
        connection: {
          remoteAddress: 'localhost',
        },
        headers: { host: 'myHostName' },
      };
      res = {
        req: req,
        header: {},
      };

      request = {
        url: req.url,
        headers: req.headers,
        raw: { req, res },
        response: res,
      };
    });

    it('should add the plugin state to the request.plugins property in automatic mode', async function () {
      sinon
        .stub(mwUtils, 'processHeaders')
        .returns({ root: traceId, parent: parentId, sampled: '0' });

      const nsResponse = {
        createContext: () => ({ prop1: 'prop1' }),
        bindEmitter: () => {},
        enter: () => {},
      };
      sinon.stub(xray, 'getNamespace').returns(nsResponse);
      sinon.stub(xray, 'setSegment').returns(null);
      fastifyXray.setup({ automaticMode: true });
      await fastifyXray.handleRequest(request, h);

      assert.isDefined(request.plugins.fastifyXray);
      assert.deepEqual(request.plugins.fastifyXray.xrayNamespace, nsResponse);
      assert.deepEqual(request.plugins.fastifyXray.xrayContext, {
        prop1: 'prop1',
      });
    });

    it('should not add the plugin state to the request.plugins property in manual mode', async function () {
      fastifyXray.setup({ automaticMode: false });
      await fastifyXray.handleRequest(request, h);

      assert.isUndefined(request.plugins);
    });

    it('should run the request handler function and create a request segment', async function () {
      fastifyXray.setup({ automaticMode: false });
      const result = await fastifyXray.handleRequest(request, h);
      assert.isDefined(result);
      assert.isDefined(request.segment);
      assert.isDefined(request.segment.trace_id);
      assert.isDefined(request.segment.id);
      assert.isDefined(request.segment.start_time);
      assert.isDefined(request.segment.name);
      assert.isDefined(request.segment.aws);
      assert.isDefined(request.segment.http);
    });

    describe('when handling a request', function () {
      let addReqDataSpy, newSegmentSpy, processHeadersStub, resolveNameStub;

      beforeEach(function () {
        fastifyXray.setup({ automaticMode: false });
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
        fastifyXray.handleRequest(request, h);

        processHeadersStub.should.have.been.calledOnce;
        processHeadersStub.should.have.been.calledWithExactly(request);
      });

      it('should call mwUtils.resolveName to find the name of the segment', function () {
        fastifyXray.handleRequest(request, h);

        resolveNameStub.should.have.been.calledOnce;
        resolveNameStub.should.have.been.calledWithExactly(
          request.headers.host
        );
      });

      it('should create a new segment', function () {
        fastifyXray.handleRequest(request, h);

        newSegmentSpy.should.have.been.calledOnce;
        newSegmentSpy.should.have.been.calledWithExactly(
          defaultName,
          traceId,
          parentId
        );
      });

      it('should add a new http property on the segment', function () {
        fastifyXray.handleRequest(request, h);

        addReqDataSpy.should.have.been.calledOnce;
        addReqDataSpy.should.have.been.calledWithExactly(
          sinon.match.instanceOf(IncomingRequestData)
        );
      });
    });

    describe('when the request completes', function () {
      beforeEach(function () {
        fastifyXray.setup({ automaticMode: false });
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

        fastifyXray.handleRequest(request, h);
        res.statusCode = 400;
        fastifyXray.handleResponse(request);

        assert.equal(request.segment.error, true);
        getCauseStub.should.have.been.calledWith(400);
      });

      it('should add the fault flag on the segment on 5xx', function () {
        const getCauseStub = sinon
          .stub(xray.utils, 'getCauseTypeFromHttpStatus')
          .returns('fault');

        fastifyXray.handleRequest(request, h);

        res.statusCode = 500;
        fastifyXray.handleError(request, new Error('test Error!'));
        fastifyXray.handleResponse(request);

        assert.equal(request.segment.fault, true);
        getCauseStub.should.have.been.calledWith(500);
      });

      it('should add the throttle flag and error flag on the segment on a 429', function () {
        fastifyXray.handleRequest(request, h);
        res.statusCode = 429;
        fastifyXray.handleResponse(request);

        assert.equal(request.segment.throttle, true);
        assert.equal(request.segment.error, true);
      });

      it('should add nothing on anything else', function () {
        fastifyXray.handleRequest(request, h);
        res.statusCode = 200;
        fastifyXray.handleResponse(request);

        assert.notProperty(request.segment, 'error');
        assert.notProperty(request.segment, 'fault');
        assert.notProperty(request.segment, 'throttle');
      });
    });
  });
});
