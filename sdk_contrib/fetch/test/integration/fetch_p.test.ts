import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { captureFetch, captureFetchGlobal, captureFetchModule } from '../../lib/fetch_p';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

import contextUtils = require('aws-xray-sdk-core/lib/context_utils');
import * as fetchModule from 'node-fetch';
import Segment = require('aws-xray-sdk-core/lib/segments/segment');
import Subsegment = require('aws-xray-sdk-core/lib/segments/attributes/subsegment');

describe('Integration tests', function () {
  const goodUrl = 'https://example.org';
  const badUrl = 'http://localhost:1';

  const hasGlobalFetch = globalThis.fetch !== undefined;

  describe('captureFetch', function () {

    let saveGlobalFetch: any;
    let saveModuleFetch: any;
    let sandbox: sinon.SinonSandbox;
    let mockSegment: Segment;
    let mockSubsegment: Subsegment;
    let stubIsAutomaticMode: sinon.SinonStub;
    let stubAddNewSubsegment: sinon.SinonStub;
    let stubResolveSegment: sinon.SinonStub;
    let stubAddRemoteRequestData: sinon.SinonStub;
    let stubAddErrorFlag: sinon.SinonStub;
    let stubClose: sinon.SinonStub;

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
        const globalThisAsAny = globalThis as any;
        globalThis.fetch = saveGlobalFetch;
        delete globalThisAsAny.__fetch;
      }

      const fetchModuleAsAny = fetchModule as any;
      fetchModuleAsAny.default = saveModuleFetch;
      delete fetchModuleAsAny.__fetch;

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

    let saveGlobalFetch: any;
    let sandbox: sinon.SinonSandbox;
    let mockSegment: Segment;
    let mockSubsegment: Subsegment;
    let stubIsAutomaticMode: sinon.SinonStub;
    let stubAddNewSubsegment: sinon.SinonStub;
    let stubResolveSegment: sinon.SinonStub;
    let stubAddRemoteRequestData: sinon.SinonStub;
    let stubAddErrorFlag: sinon.SinonStub;
    let stubClose: sinon.SinonStub;

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
      const globalThisAsAny = globalThis as any;
      globalThis.fetch = saveGlobalFetch;
      delete globalThisAsAny.__fetch;

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
    let saveModuleFetch: any;
    let sandbox: sinon.SinonSandbox;
    let mockSegment: Segment;
    let mockSubsegment: Subsegment;
    let stubIsAutomaticMode: sinon.SinonStub;
    let stubAddNewSubsegment: sinon.SinonStub;
    let stubResolveSegment: sinon.SinonStub;
    let stubAddRemoteRequestData: sinon.SinonStub;
    let stubAddErrorFlag: sinon.SinonStub;
    let stubClose: sinon.SinonStub;

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
      const fetchModuleAsAny = fetchModule as any;
      fetchModuleAsAny.default = saveModuleFetch;
      delete fetchModuleAsAny.__fetch;

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
