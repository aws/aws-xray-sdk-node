const xray = require('aws-xray-sdk-core');
const chai = require('chai');
const sinon = require('sinon').createSandbox();
const sinonChai = require('sinon-chai');
const { expect } = chai;
const Fastify = require('fastify');
const fp = require('fastify-plugin');

const xrayFastifyPlugin = require('../../lib/plugin');
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
  /** @type { import('fastify').FastifyInstance } */
  let app;

  beforeEach(async function () {
    app = Fastify({ logger: false });
  });

  afterEach(async function () {
    sinon.restore();
    await app.close();
  });

  describe('#plugin', function () {
    it('should set up xray with options specified in the plugin', async function () {
      this.timeout(3000); //On rare occasion this test times out...adding more time
      const testLogger = { error: () => 'error', debug: () => 'debug' };
      const captureAwsSpy = sinon.spy(xray, 'captureAWS');
      const captureHttpSpy = sinon.spy(xray, 'captureHTTPsGlobal');
      const capturePromiseSpy = sinon.spy(xray, 'capturePromise');

      app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        captureAWS: true,
        captureHTTP: true,
        capturePromises: true,
        logger: testLogger,
      });

      await app.ready();

      expect(xray.getLogger()).to.deep.equal(testLogger);
      expect(mwUtils.defaultName).to.equal('test segment');
      expect(captureAwsSpy).to.have.been.calledOnce;
      expect(captureHttpSpy).to.have.been.calledTwice;
      expect(capturePromiseSpy).to.have.been.calledOnce;
    });
  });

  describe('#setup', function () {
    it('should set the default segment name on xray', function () {
      app.register(xrayFastifyPlugin, { segmentName: 'test segment' });
      expect(mwUtils.defaultName).to.equal('test segment');
    });

    it('should throws an error for a missing segment name on xray', async function () {
      try {
        await app.register(xrayFastifyPlugin, {});
      } catch (error) {
        expect(error.message).to.equal('segmentName is required');
      }
    });

    it('should be set to default parameters on xray', async function () {
      await app.register(xrayFastifyPlugin, { segmentName: 'test segment' });
      expect(xray.isAutomaticMode()).to.be.true;
      expect(xray.getLogger()).to.deep.equal(app.log);
    });

    it('should set manual mode on xray', async function () {
      await app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        automaticMode: false,
      });
      expect(xray.isAutomaticMode()).to.be.false;
    });

    it('should set the passed logger', async function () {
      const testLogger = { error: () => 'error', debug: () => 'debug' };
      await app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        logger: testLogger,
      });
      expect(xray.getLogger()).to.deep.equal(testLogger);
    });

    it('should call captureAWS when captureAWS is true', async function () {
      const captureSpy = sinon.spy(xray, 'captureAWS');
      await app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        captureAWS: true,
      });
      expect(captureSpy).to.be.calledOnce;
    });

    it('should set plugins when provided', async function () {
      const pluginSpy = sinon.spy(xray.plugins.ECSPlugin, 'getData');
      await app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        plugins: [xray.plugins.ECSPlugin],
      });
      expect(pluginSpy).to.be.calledOnce;
    });

    it('should call captureHTTPsGlobal when captureHttp is true', async function () {
      const captureSpy = sinon.spy(xray, 'captureHTTPsGlobal');
      await app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        captureHTTP: true,
      });
      expect(captureSpy).to.be.calledTwice;
    });

    it('should call capturePromise when capturePromises is true', async function () {
      const captureSpy = sinon.spy(xray, 'capturePromise');
      await app.register(xrayFastifyPlugin, {
        segmentName: 'test segment',
        capturePromises: true,
      });
      expect(captureSpy).to.be.calledOnce;
    });
  });

  describe('#createRequestHandler', function () {
    it('should run the request handler function and create a request segment', async function () {
      app.register(fp(xrayFastifyPlugin), {
        segmentName: 'test segment',
        automaticMode: false,
      });

      app.get('/', (request, reply) => {
        expect(request.segment).to.be.an.instanceOf(Segment);

        reply.send('OK');
      });

      await app.ready();

      const { statusCode } = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(statusCode).to.equal(200);
    });

    describe('when handling a request', function () {
      let addReqDataSpy, newSegmentSpy, processHeadersStub, resolveNameStub;

      beforeEach(async function () {
        app.register(fp(xrayFastifyPlugin), {
          segmentName: 'test segment',
          automaticMode: false,
        });

        app.get('/', (request, reply) => {
          expect(request.segment).to.be.an.instanceOf(Segment);

          reply.send('OK');
        });

        await app.ready();

        newSegmentSpy = sinon.spy(Segment.prototype, 'init');
        addReqDataSpy = sinon.spy(Segment.prototype, 'addIncomingRequestData');

        processHeadersStub = sinon
          .stub(mwUtils, 'processHeaders')
          .returns({ root: traceId, parent: parentId, sampled: '0' });

        resolveNameStub = sinon
          .stub(mwUtils, 'resolveName')
          .returns(defaultName);
      });

      afterEach(async function () {
        sinon.restore();
        delete process.env.AWS_XRAY_TRACING_NAME;

        await app.close();
      });

      it('should call mwUtils.processHeaders to split the headers, if any', async function () {
        await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(processHeadersStub).to.have.been.calledOnce;
        expect(processHeadersStub).to.have.been.calledWithMatch({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });
      });

      it('should call mwUtils.resolveName to find the name of the segment', async function () {
        await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(resolveNameStub).to.have.been.calledOnce;
        expect(resolveNameStub).to.have.been.calledWithExactly(hostName);
      });

      it('should create a new segment', async function () {
        await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(newSegmentSpy).to.have.been.calledOnce;
        expect(newSegmentSpy).to.have.been.calledWithExactly(
          defaultName,
          traceId,
          parentId
        );
      });

      it('should add a new http property on the segment', async function () {
        await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(addReqDataSpy).to.have.been.calledOnce;
        expect(addReqDataSpy).to.have.been.calledWithExactly(
          sinon.match.instanceOf(IncomingRequestData)
        );
      });
    });

    describe('when the request completes', function () {
      beforeEach(function () {
        app.register(fp(xrayFastifyPlugin), {
          segmentName: 'test segment',
          automaticMode: false,
        });

        sinon.stub(SegmentEmitter);
        sinon.stub(ServiceConnector);
      });

      afterEach(async function () {
        sinon.restore();

        await app.close();
      });

      it('should add the error flag on the segment on 4xx', async function () {
        let localSegment;
        const getCauseStub = sinon
          .stub(xray.utils, 'getCauseTypeFromHttpStatus')
          .returns('error');

        app.get('/', async (request, reply) => {
          reply.code(400).send('Bad Request');
        });

        app.addHook('onResponse', (request, reply, done) => {
          localSegment = request.segment;
          done();
        });

        await app.ready();

        const { statusCode } = await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(statusCode).to.equal(400);
        expect(localSegment.error).to.be.true;
        expect(getCauseStub).to.have.been.calledWith(400);
      });

      it('should add the fault flag on the segment on 5xx', async function () {
        let localSegment;
        const getCauseStub = sinon
          .stub(xray.utils, 'getCauseTypeFromHttpStatus')
          .returns('fault');

        app.get('/', async (request, reply) => {
          reply.code(500).send('Internal Server Error');
        });

        app.addHook('onResponse', (request, reply, done) => {
          localSegment = request.segment;
          done();
        });

        await app.ready();

        const { statusCode } = await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(statusCode).to.equal(500);
        expect(localSegment.fault).to.be.true;
        expect(getCauseStub).to.have.been.calledWith(500);
      });

      it('should add the throttle flag and error flag on the segment on a 429', async function () {
        let localSegment;
        app.get('/', async (request, reply) => {
          reply.code(429).send('Too Many Requests');
        });

        app.addHook('onResponse', (request, reply, done) => {
          localSegment = request.segment;
          done();
        });

        await app.ready();

        const { statusCode } = await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(localSegment.throttle).to.be.true;
        expect(localSegment.error).to.be.true;
        expect(statusCode).to.equal(429);
      });

      it('should add nothing on anything else', async function () {
        let localSegment;
        app.get('/', async (request, reply) => {
          reply.send('OK');
        });

        app.addHook('onResponse', (request, reply, done) => {
          localSegment = request.segment;
          done();
        });

        await app.ready();

        const { statusCode } = await app.inject({
          method: 'GET',
          url: '/',
          headers: { host: hostName },
        });

        expect(localSegment.throttle).to.be.undefined;
        expect(localSegment.error).to.be.undefined;
        expect(localSegment.fault).to.be.undefined;
        expect(statusCode).to.equal(200);
      });
    });
  });
});
