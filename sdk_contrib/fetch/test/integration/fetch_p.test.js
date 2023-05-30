const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const { captureFetch, captureFetchGlobal, captureFetchModule } = require('../../lib/fetch_p');

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const contextUtils = require('aws-xray-sdk-core/lib/context_utils');
const fetchModule = require('node-fetch');
const Segment = require('aws-xray-sdk-core/lib/segments/segment');
const Subsegment = require('aws-xray-sdk-core/lib/segments/attributes/subsegment');

describe('Integration tests', function () {
  const goodUrl = 'https://example.org';
  const badUrl = 'http://localhost:1';

  const hasGlobalFetch = globalThis.fetch !== undefined;

  describe('captureFetch', function () {

    let saveGlobalFetch;
    let saveModuleFetch;
    let sandbox;
    let mockSegment;
    let mockSubsegment;
    let stubIsAutomaticMode;
    let stubAddNewSubsegment;
    let stubResolveSegment;
    let stubAddRemoteRequestData;
    let stubAddErrorFlag;
    let stubClose;

    beforeEach(function () {
      if (hasGlobalFetch) {
        saveGlobalFetch = globalThis.fetch;
      }
      saveModuleFetch = fetchModule.default;

      sandbox = sinon.createSandbox();
      mockSegment = new Segment('foo');
      mockSubsegment = new Subsegment('bar');

      stubIsAutomaticMode = sandbox.stub(contextUtils, 'isAutomaticMode').returns(false);
      stubAddNewSubsegment = sandbox.stub(mockSegment, 'addNewSubsegment').returns(mockSubsegment);
      stubResolveSegment = sandbox.stub(contextUtils, 'resolveSegment').returns(mockSegment);
      stubAddRemoteRequestData = sandbox.stub(mockSubsegment, 'addRemoteRequestData');
      stubAddErrorFlag = sandbox.stub(mockSubsegment, 'addErrorFlag');
      stubClose = sandbox.stub(mockSubsegment, 'close');
    });

    afterEach(function () {
      if (hasGlobalFetch) {
        globalThis.fetch = saveGlobalFetch;
        delete globalThis.__fetch;
      }

      fetchModule.default = saveModuleFetch;
      delete fetchModule.__fetch;

      sandbox.restore();
      sandbox.resetHistory();
    });

    it('retrieves content and call AddRemoteRequestData', async function () {
      const spyCallback = sandbox.spy();
      const fetch = captureFetch(true, spyCallback);
      const response = await fetch(goodUrl);
      response.status.should.equal(200);
      (await response.text()).should.contain('Example');
      stubIsAutomaticMode.should.have.been.called;
      stubAddNewSubsegment.should.have.been.calledOnce;
      stubResolveSegment.should.have.been.calledOnce;
      stubAddRemoteRequestData.should.have.been.calledOnce;
      stubAddErrorFlag.should.not.have.been.calledOnce;
      stubClose.should.have.been.calledOnce;
    });

    it('sets error flag on failed fetch when fetch exists', async function () {
      const spyCallback = sandbox.spy();
      const fetch = captureFetch(true, spyCallback);
      await fetch(badUrl).should.eventually.be.rejected;
      stubIsAutomaticMode.should.have.been.called;
      stubAddNewSubsegment.should.have.been.calledOnce;
      stubResolveSegment.should.have.been.calledOnce;
      stubAddRemoteRequestData.should.have.been.calledOnce;
      stubAddErrorFlag.should.have.been.calledOnce;
      stubClose.should.have.been.calledOnce;
    });
  });

  describe('captureFetchModule', function () {

    let saveGlobalFetch;
    let sandbox;
    let mockSegment;
    let mockSubsegment;
    let stubIsAutomaticMode;
    let stubAddNewSubsegment;
    let stubResolveSegment;
    let stubAddRemoteRequestData;
    let stubAddErrorFlag;
    let stubClose;

    beforeEach(function () {
      saveGlobalFetch = globalThis.fetch;

      sandbox = sinon.createSandbox();
      mockSegment = new Segment('foo');
      mockSubsegment = new Subsegment('bar');

      stubIsAutomaticMode = sandbox.stub(contextUtils, 'isAutomaticMode').returns(false);
      stubAddNewSubsegment = sandbox.stub(mockSegment, 'addNewSubsegment').returns(mockSubsegment);
      stubResolveSegment = sandbox.stub(contextUtils, 'resolveSegment').returns(mockSegment);
      stubAddRemoteRequestData = sandbox.stub(mockSubsegment, 'addRemoteRequestData');
      stubAddErrorFlag = sandbox.stub(mockSubsegment, 'addErrorFlag');
      stubClose = sandbox.stub(mockSubsegment, 'close');
    });

    afterEach(function () {
      globalThis.fetch = saveGlobalFetch;
      delete globalThis.__fetch;

      sandbox.restore();
      sandbox.resetHistory();
    });

    if (hasGlobalFetch) {
      it('retrieves content and call AddRemoteRequestData when global fetch exists', async function () {
        const spyCallback = sandbox.spy();
        const fetch = captureFetchGlobal(true, spyCallback);
        const response = await fetch(goodUrl);
        response.status.should.equal(200);
        (await response.text()).should.contain('Example');
        stubIsAutomaticMode.should.have.been.called;
        stubAddNewSubsegment.should.have.been.calledOnce;
        stubResolveSegment.should.have.been.calledOnce;
        stubAddRemoteRequestData.should.have.been.calledOnce;
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
        stubAddRemoteRequestData.should.have.been.calledOnce;
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
    let sandbox;
    let mockSegment;
    let mockSubsegment;
    let stubIsAutomaticMode;
    let stubAddNewSubsegment;
    let stubResolveSegment;
    let stubAddRemoteRequestData;
    let stubAddErrorFlag;
    let stubClose;

    beforeEach(function () {
      saveModuleFetch = fetchModule.default;

      sandbox = sinon.createSandbox();
      mockSegment = new Segment('foo');
      mockSubsegment = new Subsegment('bar');

      stubIsAutomaticMode = sandbox.stub(contextUtils, 'isAutomaticMode').returns(false);
      stubAddNewSubsegment = sandbox.stub(mockSegment, 'addNewSubsegment').returns(mockSubsegment);
      stubResolveSegment = sandbox.stub(contextUtils, 'resolveSegment').returns(mockSegment);
      stubAddRemoteRequestData = sandbox.stub(mockSubsegment, 'addRemoteRequestData');
      stubAddErrorFlag = sandbox.stub(mockSubsegment, 'addErrorFlag');
      stubClose = sandbox.stub(mockSubsegment, 'close');
    });

    afterEach(function () {
      fetchModule.default = saveModuleFetch;
      delete fetchModule.__fetch;

      sandbox.restore();
      sandbox.resetHistory();
    });

    it('should retrieve content and call AddRemoteRequestData', async function () {
      const spyCallback = sandbox.spy();
      const fetch = captureFetchModule(fetchModule, true, spyCallback);
      const response = await fetch(goodUrl);
      response.status.should.equal(200);
      (await response.text()).should.contain('Example');
      stubIsAutomaticMode.should.have.been.called;
      stubAddNewSubsegment.should.have.been.calledOnce;
      stubResolveSegment.should.have.been.calledOnce;
      stubAddRemoteRequestData.should.have.been.calledOnce;
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
      stubAddRemoteRequestData.should.have.been.calledOnce;
      stubAddErrorFlag.should.have.been.calledOnce;
      stubClose.should.have.been.calledOnce;
    });
  });
});
