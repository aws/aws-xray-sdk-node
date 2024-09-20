
let listener;
let server;
let goodUrl;
let receivedHeaders;


before(() => {
  // Create an HTTP server to receive requests.
  const http = require('http');
  server = http.createServer((req, res) => {
    receivedHeaders = { ...req.headers };
    // Respond with something
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Example reply\n');
  });

  listener = server.listen();
  const address = server.address();
  const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
  goodUrl = `http://${host}:${address.port}/test`;
});

after(() => {
  // close http server
  listener.close();
});

describe('Integration tests', function () {
  const chai = require('chai');
  const sinonChai = require('sinon-chai');
  console.log('In integration test');
  const { captureFetchGlobal, captureFetchModule } = require('../../lib/fetch_p');

  chai.should();
  chai.use(sinonChai);

  const global = require('../global');
  const AWSXray = global.AWSXray;
  const sandbox = global.sandbox;
  const stubResolveSegment = global.stubResolveSegment;
  const stubIsAutomaticMode = global.stubIsAutomaticMode;

  const fetchModule = require('node-fetch');
  const Segment = AWSXray.Segment;
  const Subsegment = AWSXray.Subsegment;
  const badUrl = 'http://localhost:1';

  const hasGlobalFetch = globalThis.fetch !== undefined;

  describe('captureFetchGlobal', function () {

    let saveGlobalFetch;
    let mockSegment;
    let mockSubsegment;
    let stubAddNewSubsegment;
    let stubAddFetchRequestData;
    let stubAddErrorFlag;
    let stubClose;

    beforeEach(function () {
      saveGlobalFetch = globalThis.fetch;

      mockSegment = new Segment('foo');
      mockSubsegment = new Subsegment('bar');

      stubIsAutomaticMode.returns(false);
      stubAddNewSubsegment = sandbox.stub(mockSegment, 'addNewSubsegment').returns(mockSubsegment);
      stubResolveSegment.returns(mockSegment);
      stubAddFetchRequestData = sandbox.stub(mockSubsegment, 'addFetchRequestData');
      stubAddErrorFlag = sandbox.stub(mockSubsegment, 'addErrorFlag');
      stubClose = sandbox.stub(mockSubsegment, 'close');
      receivedHeaders = {};
    });

    afterEach(function () {
      globalThis.fetch = saveGlobalFetch;
      delete globalThis.__fetch;
    });

    if (hasGlobalFetch) {
      it('retrieves content and call addRemoteRequestData when global fetch exists', async function () {
        const spyCallback = sandbox.spy();
        const fetch = captureFetchGlobal(true, spyCallback);
        const response = await fetch(goodUrl);
        response.status.should.equal(200);
        (await response.text()).should.contain('Example');
        stubIsAutomaticMode.should.have.been.called;
        stubAddNewSubsegment.should.have.been.calledOnce;
        stubResolveSegment.should.have.been.calledOnce;
        stubAddFetchRequestData.should.have.been.calledOnce;
        stubAddErrorFlag.should.not.have.been.calledOnce;
        stubClose.should.have.been.calledOnce;
      });

      it('adds header', async function () {
        const spyCallback = sandbox.spy();
        const fetch = captureFetchGlobal(true, spyCallback);
        const response = await fetch(goodUrl, { headers: {
          'foo': 'bar'
        }});
        response.status.should.equal(200);
        receivedHeaders.should.to.have.property('x-amzn-trace-id');
        receivedHeaders.should.to.have.property('foo', 'bar');
        (await response.text()).should.contain('Example');
        stubIsAutomaticMode.should.have.been.called;
        stubAddNewSubsegment.should.have.been.calledOnce;
        stubResolveSegment.should.have.been.calledOnce;
        stubAddFetchRequestData.should.have.been.calledOnce;
        stubAddErrorFlag.should.not.have.been.calledOnce;
        stubClose.should.have.been.calledOnce;
      });

      it('sets error flag on failed fetch when global fetch exists', async function () {
        const spyCallback = sandbox.spy();
        const fetch = captureFetchGlobal(true, spyCallback);
        await fetch(badUrl).should.eventually.be.rejected;
        stubIsAutomaticMode.should.have.been.called;
        stubAddNewSubsegment.should.have.been.calledOnce;
        stubResolveSegment.should.have.been.calledOnce;
        stubAddFetchRequestData.should.have.been.calledOnce;
        stubAddErrorFlag.should.have.been.calledOnce;
        stubClose.should.have.been.calledOnce;
      });
    } else {
      it('fails when global fetch does not exist', function () {
        (() => captureFetchGlobal(true)).should.throw('Global fetch is not available in NodeJS');
      });
    }
  });

  describe('captureFetchModule', function () {
    let saveModuleFetch;
    let mockSegment;
    let mockSubsegment;
    let stubAddNewSubsegment;
    let stubAddFetchRequestData;
    let stubAddErrorFlag;
    let stubClose;

    beforeEach(function () {
      saveModuleFetch = fetchModule.default;

      mockSegment = new Segment('foo');
      mockSubsegment = new Subsegment('bar');

      stubIsAutomaticMode.returns(false);
      stubAddNewSubsegment = sandbox.stub(mockSegment, 'addNewSubsegment').returns(mockSubsegment);
      stubResolveSegment.returns(mockSegment);
      stubAddFetchRequestData = sandbox.stub(mockSubsegment, 'addFetchRequestData');
      stubAddErrorFlag = sandbox.stub(mockSubsegment, 'addErrorFlag');
      stubClose = sandbox.stub(mockSubsegment, 'close');
    });

    afterEach(function () {
      fetchModule.default = saveModuleFetch;
      delete fetchModule.__fetch;
    });

    it('should retrieve content and call addFetchRequestData', async function () {
      const spyCallback = sandbox.spy();
      const fetch = captureFetchModule(fetchModule, true, spyCallback);
      const response = await fetch(goodUrl);
      response.status.should.equal(200);
      receivedHeaders.should.to.have.property('x-amzn-trace-id');
      (await response.text()).should.contain('Example');
      stubIsAutomaticMode.should.have.been.called;
      stubAddNewSubsegment.should.have.been.calledOnce;
      stubResolveSegment.should.have.been.calledOnce;
      stubAddFetchRequestData.should.have.been.calledOnce;
      stubAddErrorFlag.should.not.have.been.calledOnce;
      stubClose.should.have.been.calledOnce;
    });

    it('should set error flag on failed fetch', async function () {
      const spyCallback = sandbox.spy();
      const fetch = captureFetchModule(fetchModule, true, spyCallback);
      await fetch(badUrl).should.eventually.be.rejected;
      stubIsAutomaticMode.should.have.been.called;
      stubAddNewSubsegment.should.have.been.calledOnce;
      stubResolveSegment.should.have.been.calledOnce;
      stubAddFetchRequestData.should.have.been.calledOnce;
      stubAddErrorFlag.should.have.been.calledOnce;
      stubClose.should.have.been.calledOnce;
    });
  });
});
