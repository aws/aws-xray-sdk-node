const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');

const contextUtils = require('aws-xray-sdk-core/lib/context_utils');
const utils = require('aws-xray-sdk-core/lib/utils');
const logger = require('aws-xray-sdk-core/lib/logger');

const fetchModule = require('node-fetch');
const { captureFetch, captureFetchGlobal, captureFetchModule } = require('../../lib/fetch_p');
const fetch_p = require('../../lib/fetch_p');

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const globalFetchAvailable = 'fetch' in globalThis;

describe('Unit tests', function () {

  // These unit tests need to work across NodeJS versions that
  // do and do not include fetch built-in
  describe('capture functions', function () {

    let sandbox;
    let spyCaptureFetchGlobal;
    let spyCaptureFetchModule;
    let spyLogWarn;
    let saveGlobalFetch;
    let saveModuleFetch;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      spyCaptureFetchGlobal = sandbox.spy(fetch_p, 'captureFetchGlobal');
      spyCaptureFetchModule = sandbox.spy(fetch_p, 'captureFetchModule');
      spyLogWarn = sandbox.spy();
      sandbox.stub(logger, 'getLogger').returns({
        warn: spyLogWarn
      });
      saveGlobalFetch = globalThis.fetch;
      saveModuleFetch = fetchModule.default;
    });

    afterEach(function () {
      fetchModule.default = saveModuleFetch;
      if (saveGlobalFetch) {
        globalThis.fetch = saveGlobalFetch;
      } else {
        delete globalThis.fetch;
      }
      delete globalThis.__fetch;
      delete fetchModule.__fetch;
      sandbox.restore();
      sandbox.resetHistory();
    });

    describe('captureFetch', function () {
      it('captures global fetch if fetch exists in globalThis', function () {
        globalThis.fetch = sinon.stub();
        captureFetch(true);
        spyCaptureFetchGlobal.should.have.been.calledOnce;
        spyCaptureFetchModule.should.not.have.been.calledOnce;
      });
      it('captures module fetch if fetch does not exist in globalThis', function () {
        delete globalThis.fetch;
        captureFetch(true);
        spyCaptureFetchGlobal.should.not.have.been.calledOnce;
        spyCaptureFetchModule.should.have.been.calledOnce;
      });
    });

    describe('captureFetchGlobal', function () {
      it('stubs out the function', function () {
        const saveFetch = globalThis.fetch;
        const placeholder = sinon.stub();
        globalThis.fetch = placeholder;
        captureFetchGlobal(true);
        globalThis.fetch.should.not.equal(placeholder);
        globalThis.__fetch.should.equal(placeholder);
        globalThis.fetch = saveFetch;
        delete globalThis.__fetch;
      });
    });

    describe('captureFetchModule', function () {
      it('stubs out the function', function () {
        const saveFetch = fetchModule.default;
        const placeholder = sinon.stub();
        fetchModule.default = placeholder;
        captureFetchModule(fetchModule, true);
        fetchModule.default.should.not.equal(placeholder);
        fetchModule.__fetch.should.equal(placeholder);
        fetchModule.default = saveFetch;
        delete fetchModule.__fetch;
      });

      it('warns if module fetch is not available', function () {
        captureFetchModule({}, true);
        spyLogWarn.should.have.been.calledOnceWith('X-ray capture did not find fetch function in module');
      });
    });
  });

  describe('captured fetch', function () {

    let sandbox;
    let FetchRequest;
    let saveFetch;
    let stubFetch;
    let stubValidResponse;
    let spyLogWarn;
    let spyLogInfo;
    let stubResolveSegment;
    let stubResolveManualSegmentParams;
    let stubIsAutomaticMode;
    let stubParentSegment;
    let stubSubsegment;
    let stubAddNewSubsegmentWithoutSampling;
    let stubAddNewSubsegment;
    let spyAddRemoteRequestData;
    let spyAddErrorFlag;
    let spyAddThrottleFlag;
    let spyClose;

    const useGlobalFetch = globalFetchAvailable;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      stubValidResponse = {
        statusCode: 200,
        status: 'OK'
      };

      stubResolveSegment = sandbox.stub(contextUtils, 'resolveSegment');
      stubResolveManualSegmentParams = sandbox.stub(contextUtils, 'resolveManualSegmentParams');

      spyLogWarn = sandbox.spy();
      spyLogInfo = sandbox.spy();
      sandbox.stub(logger, 'getLogger').returns({
        warn: spyLogWarn,
        info: spyLogInfo
      });

      stubSubsegment = sandbox.stub();
      spyAddRemoteRequestData = sandbox.spy();
      stubSubsegment.addRemoteRequestData = spyAddRemoteRequestData;
      spyAddErrorFlag = sandbox.spy();
      stubSubsegment.addErrorFlag = spyAddErrorFlag;
      spyAddThrottleFlag = sandbox.spy();
      stubSubsegment.addThrottleFlag = spyAddThrottleFlag;
      spyClose = sandbox.spy();
      stubSubsegment.close = spyClose;

      stubAddNewSubsegment = sandbox.stub();
      stubAddNewSubsegmentWithoutSampling = sandbox.stub();

      stubParentSegment = sandbox.stub();
      stubParentSegment.addNewSubsegment = stubAddNewSubsegment;
      stubParentSegment.addNewSubsegmentWithoutSampling = stubAddNewSubsegmentWithoutSampling;

      // Test against global fetch, if available,
      // otherwise, fall back to fetch module
      if (useGlobalFetch) {
        saveFetch = globalThis.fetch;
        stubFetch = sandbox.stub(globalThis, 'fetch');
        FetchRequest = globalThis.Request;
      } else {
        saveFetch = fetchModule.default;
        stubFetch = sandbox.stub(fetchModule, 'default');
        FetchRequest = fetchModule.Request;
      }

      stubResolveManualSegmentParams.returns(null);
      stubResolveSegment.returns(stubParentSegment);
      stubAddNewSubsegment.returns(stubSubsegment);
      stubAddNewSubsegmentWithoutSampling.returns(stubSubsegment);
      stubFetch.resolves(stubValidResponse);

      // We have to create and re-create this stub here because promise_p.test doesn't use sandboxes
      stubIsAutomaticMode = sandbox.stub(contextUtils, 'isAutomaticMode');
      stubIsAutomaticMode.returns(true);
    });

    this.afterEach(function () {
      stubIsAutomaticMode.restore();
      if (useGlobalFetch) {
        delete globalThis.__fetch;
        globalThis.fetch = saveFetch;
      } else {
        delete fetchModule.__fetch;
        fetchModule.fetch = saveFetch;
      }
      sandbox.resetHistory();
      sandbox.restore();
    });

    it('short circuits if headers include trace ID', async function () {
      const activeFetch = captureFetch(true);
      const request = new fetchModule.Request('https://www.foo.com', {
        headers: {
          'X-Amzn-Trace-Id': '12345'
        }
      });
      await activeFetch(request);
      stubFetch.should.have.been.calledOnceWith(request);
      stubResolveSegment.should.not.have.been.called;
    });

    it('calls base function when no parent and automatic mode', async function () {
      const activeFetch = captureFetch(true);
      stubResolveSegment.returns(null);
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      spyLogInfo.should.have.been.calledOnceWith('RequestInit for request [ host: www.foo.com, method: GET, path: /test ] is missing the sub/segment context for automatic mode. Ignoring.');
      stubFetch.should.have.been.calledOnceWith(request);
    });

    it('calls base function when no parent and not automatic mode', async function () {
      const activeFetch = captureFetch(true);
      stubResolveSegment.returns(null);
      stubIsAutomaticMode.returns(false);
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      spyLogInfo.should.have.been.calledOnceWith('RequestInit for request [ host: www.foo.com, method: GET, path: /test ] requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
      stubFetch.should.have.been.calledOnceWith(request);
    });

    it('short circuits and displays info when no parent and no method', async function () {
      const activeFetch = captureFetch(true);
      stubResolveSegment.returns(null);
      stubIsAutomaticMode.returns(false);
      const request = new FetchRequest('https://www.foo.com/test',);
      const stubRequestMethod = sandbox.stub(request, 'method').get(sandbox.stub().returns(undefined));
      await activeFetch(request);
      spyLogInfo.should.have.been.calledOnceWith('RequestInit for request [ host: www.foo.com, path: /test ] requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
      stubFetch.should.have.been.calledOnceWith(request);
      stubRequestMethod.restore();
    });

    it('passes Segment information to resolveManualSegmentParams if included in request configuration', async function () {
      const activeFetch = captureFetch(true);
      const requestInfo = {
        Segment: {}
      };
      await activeFetch('https://www.foo.com/test', requestInfo);
      stubResolveManualSegmentParams.should.have.been.calledOnceWith(requestInfo);
    });

    it('adds new segment with sampling if parent notTraced is false', async function () {
      const activeFetch = captureFetch(true);
      stubParentSegment.notTraced = false;
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      stubAddNewSubsegment.should.have.been.calledOnceWith('www.foo.com');
      stubAddNewSubsegmentWithoutSampling.should.not.have.been.called;
    });

    it('adds new segment without sampling if parent notTraced is true', async function () {
      const activeFetch = captureFetch(true);
      stubParentSegment.notTraced = true;
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      stubAddNewSubsegmentWithoutSampling.should.have.been.calledOnceWith('www.foo.com');
      stubAddNewSubsegment.should.not.have.been.called;
    });

    it('adds X-Amzn-Trace-Id header with parent\'s segment trace_id', async function () {
      const activeFetch = captureFetch(true);
      stubParentSegment.segment = { trace_id: '12345' };
      stubSubsegment.notTraced = true;
      stubSubsegment.id = '999';
      const request = new FetchRequest('https://www.foo.com/test');
      const requestHeadersSet = sandbox.stub(request.headers, 'set');
      await activeFetch(request);
      requestHeadersSet.should.have.been.calledOnceWith('X-Amzn-Trace-Id',
        'Root=12345;Parent=999;Sampled=0');
    });

    it('adds X-Amzn-Trace-Id header with parent\'s trace_id if no parent segment', async function () {
      const activeFetch = captureFetch(true);
      stubParentSegment.trace_id = '12345';
      stubSubsegment.notTraced = true;
      stubSubsegment.id = '999';
      const request = new FetchRequest('https://www.foo.com/test');
      const requestHeadersSet = sandbox.stub(request.headers, 'set');
      await activeFetch(request);
      requestHeadersSet.should.have.been.calledOnceWith('X-Amzn-Trace-Id',
        'Root=12345;Parent=999;Sampled=0');
    });

    it('adds X-Amzn-Trace-Id header with sampled off if not traced', async function () {
      const activeFetch = captureFetch(true);
      stubParentSegment.trace_id = '12345';
      stubSubsegment.notTraced = true;
      stubSubsegment.id = '999';
      const request = new FetchRequest('https://www.foo.com/test');
      const requestHeadersSet = sandbox.stub(request.headers, 'set');
      await activeFetch(request);
      requestHeadersSet.should.have.been.calledOnceWith('X-Amzn-Trace-Id',
        'Root=12345;Parent=999;Sampled=0');
    });

    it('adds X-Amzn-Trace-Id header with sampled on if traced', async function () {
      const activeFetch = captureFetch(true);
      stubParentSegment.trace_id = '12345';
      stubSubsegment.notTraced = false;
      stubSubsegment.id = '999';
      const request = new FetchRequest('https://www.foo.com/test');
      const requestHeadersSet = sandbox.stub(request.headers, 'set');
      await activeFetch(request);
      requestHeadersSet.should.have.been.calledOnceWith('X-Amzn-Trace-Id',
        'Root=12345;Parent=999;Sampled=1');
    });

    it('calls subsegmentCallback on successful response', async function () {
      const spyCallback = sandbox.spy();
      const activeFetch = captureFetch(true, spyCallback);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyCallback.should.have.been.calledOnceWith(stubSubsegment, clonedRequest, stubValidResponse);
      stubClone.restore();
    });

    it('calls subsegment.addThrottleFlag on 429', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      stubFetch.resolves({
        status: 429,
        statusText: 'Too Many Requests'
      });
      await activeFetch(request);
      spyAddThrottleFlag.should.have.been.calledOnce;
    });

    it('sets subsegment.cause on failure', async function () {
      const activeFetch = captureFetch(true);
      const utilsCodeStub = sandbox.stub(utils, 'getCauseTypeFromHttpStatus').returns('nee');
      const request = new FetchRequest('https://www.foo.com/test');
      stubFetch.resolves({
        status: 500
      });
      await activeFetch(request);
      stubSubsegment['nee'].should.equal(true);
      utilsCodeStub.should.have.been.calledOnceWith(500);
    });

    it('calls subsegment.addRemoteRequestData with downstreamXRayEnabled set to true on success', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyAddRemoteRequestData.should.have.been.calledOnceWith(clonedRequest, stubValidResponse, true);
      stubClone.restore();
    });

    it('calls subsegment.addRemoteRequestData with downstreamXRayEnabled set to false on success', async function () {
      const activeFetch = captureFetch(false);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyAddRemoteRequestData.should.have.been.calledOnceWith(clonedRequest, stubValidResponse, false);
      stubClone.restore();
    });

    it('calls subsegment.close on success', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      spyClose.should.have.been.calledOnce;
    });

    it('resolves to response on success', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const response = await activeFetch(request);
      response.should.equal(stubValidResponse);
    });

    it('calls subsegmentCallback with error upon fetch throwing', async function () {
      const spyCallback = sandbox.spy();
      const activeFetch = captureFetch(true, spyCallback);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyCallback.should.have.been.calledOnceWith(stubSubsegment, clonedRequest, undefined, error);
    });

    it('sets subsegment error flag upon fetch throwing', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyAddErrorFlag.should.have.been.calledOnce;
    });

    it('calls addRemoteRequestData upon fetch throwing', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyAddRemoteRequestData.should.have.been.calledOnceWith(clonedRequest, undefined, true);

    });

    it('calls subsegment close with error upon fetch throwing', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyClose.should.have.been.calledOnceWith(error);
    });
  });
});
