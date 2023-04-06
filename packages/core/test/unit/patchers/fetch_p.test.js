var chaiAsPromised = require('chai-as-promised');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var logger = require('../../../lib/logger');

var contextUtils = require('../../../lib/context_utils');
var Utils = require('../../../lib/utils');

const fetchModule = require('node-fetch');
const fetch_p = require('../../../lib/patchers/fetch_p');

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const globalFetchAvailable = 'fetch' in globalThis;

describe('node-fetch', function () {

  // These unit tests need to work across NodeJS versions that
  // do and do not include fetch built-in
  describe('capture functions', function () {

    let sandbox;
    let spyLogWarn;
    let spyCaptureFetchGlobal;
    let spyCaptureFetchModule;
    let saveGlobalFetch;
    let saveModuleFetch;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      spyLogWarn = sandbox.spy();
      sandbox.stub(logger, 'getLogger').returns({
        warn: spyLogWarn
      });
      saveGlobalFetch = globalThis.fetch;
      saveModuleFetch = fetchModule.default;
      spyCaptureFetchGlobal = sandbox.spy(fetch_p, 'captureFetchGlobal');
      spyCaptureFetchModule = sandbox.spy(fetch_p, 'captureFetchModule');
    });

    afterEach(function () {
      sandbox.restore();
      globalThis.fetch = saveGlobalFetch;
      fetchModule.default = saveModuleFetch;
      delete globalThis.__fetch;
      delete fetchModule.__fetch;
    });

    describe('#captureFetch', function () {
      it('calls global fetch if fetch exists in globalThis', function () {
        globalThis.fetch = sinon.stub();
        fetch_p.captureFetch(true);
        spyCaptureFetchGlobal.should.have.been.calledOnce;
        spyCaptureFetchModule.should.not.have.been.called;
      });
      it('calls module fetch if fetch does not exist in globalThis', function () {
        delete globalThis.fetch;
        fetch_p.captureFetch(true);
        spyCaptureFetchModule.should.have.been.calledOnce;
        spyCaptureFetchGlobal.should.not.have.been.called;
      });
    });

    describe('#captureFetchGlobal', function () {
      it('stubs out the function', function () {
        const placeholder = sinon.stub();
        globalThis.fetch = placeholder;
        fetch_p.captureFetchGlobal(true);
        globalThis.fetch.should.not.equal(placeholder);
        globalThis.__fetch.should.equal(placeholder);
      });

      it('warns if global fetch is not available', function () {
        delete globalThis.fetch;
        fetch_p.captureFetchGlobal(true);
        spyLogWarn.should.have.been.calledOnceWith('X-ray capture did not detect global fetch, check NodeJS version');
      });
    });

    describe('#captureFetchModule', function () {
      it('stubs out the function', function () {
        const saveFetch = fetchModule.default;
        const placeholder = sinon.stub();
        fetchModule.default = placeholder;
        fetch_p.captureFetchModule(fetchModule, true);
        fetchModule.default.should.not.equal(placeholder);
        fetchModule.__fetch.should.equal(placeholder);
        fetchModule.default = saveFetch;
        delete fetchModule.__fetch;
      });

      it('warns if module fetch is not available', function () {
        fetch_p.captureFetchModule({}, true);
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

    const getCaptureFetch = (downstreamXRayEnabled, subsegmentCallback) => useGlobalFetch
      ? fetch_p.captureFetchGlobal(downstreamXRayEnabled, subsegmentCallback)
      : fetch_p.captureFetchModule(fetchModule, downstreamXRayEnabled, subsegmentCallback);

    before(function () {
      sandbox = sinon.createSandbox();
      // Test against embedded fetch, if available,
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
    });

    after(function () {
      sandbox.restore();
      if (useGlobalFetch) {
        globalThis.__fetch = undefined;
        globalThis.fetch = saveFetch;
      } else {
        fetchModule.__fetch = undefined;
        fetchModule.fetch = saveFetch;
      }
    });

    this.beforeEach(function () {
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
      sandbox.resetHistory();
    });

    it('short circuits if headers include trace ID', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com', {
        headers: {
          'X-Amzn-Trace-Id': '12345'
        }
      });
      await activeFetch(request);
      stubFetch.should.have.been.calledOnceWith(request);
      stubResolveSegment.should.not.have.been.called;
    });

    it('calls base function when no parent and automatic mode', async function () {
      const activeFetch =  getCaptureFetch(true);
      stubResolveSegment.returns(null);
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      spyLogInfo.should.have.been.calledOnceWith('RequestInit for request [ host: www.foo.com, method: GET, path: /test ] is missing the sub/segment context for automatic mode. Ignoring.');
      stubFetch.should.have.been.calledOnceWith(request);
    });

    it('calls base function when no parent and not automatic mode', async function () {
      const activeFetch =  getCaptureFetch(true);
      stubResolveSegment.returns(null);
      stubIsAutomaticMode.returns(false);
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      spyLogInfo.should.have.been.calledOnceWith('RequestInit for request [ host: www.foo.com, method: GET, path: /test ] requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
      stubFetch.should.have.been.calledOnceWith(request);
    });

    it('short circuits and displays info when no parent and no method', async function () {
      const activeFetch =  getCaptureFetch(true);
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
      const activeFetch =  getCaptureFetch(true);
      const requestInfo = {
        Segment: {}
      };
      await activeFetch('https://www.foo.com/test', requestInfo);
      stubResolveManualSegmentParams.should.have.been.calledOnceWith(requestInfo);
    });

    it('adds new segment with sampling if parent notTraced is false', async function () {
      const activeFetch =  getCaptureFetch(true);
      stubParentSegment.notTraced = false;
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      stubAddNewSubsegment.should.have.been.calledOnceWith('www.foo.com');
      stubAddNewSubsegmentWithoutSampling.should.not.have.been.called;
    });

    it('adds new segment without sampling if parent notTraced is true', async function () {
      const activeFetch =  getCaptureFetch(true);
      stubParentSegment.notTraced = true;
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      stubAddNewSubsegmentWithoutSampling.should.have.been.calledOnceWith('www.foo.com');
      stubAddNewSubsegment.should.not.have.been.called;
    });

    it('adds X-Amzn-Trace-Id header with parent\'s segment trace_id', async function () {
      const activeFetch =  getCaptureFetch(true);
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
      const activeFetch =  getCaptureFetch(true);
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
      const activeFetch =  getCaptureFetch(true);
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
      const activeFetch =  getCaptureFetch(true);
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
      const activeFetch =  getCaptureFetch(true, spyCallback);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyCallback.should.have.been.calledOnceWith(stubSubsegment, clonedRequest, stubValidResponse);
      stubClone.restore();
    });

    it('calls subsegment.addThrottleFlag on 429', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      stubFetch.resolves({
        statusCode: 429,
        status: 'Too Many Requests'
      });
      await activeFetch(request);
      spyAddThrottleFlag.should.have.been.calledOnce;
    });

    it('sets subsegment.cause on failure', async function () {
      const activeFetch =  getCaptureFetch(true);
      const utilsCodeStub = sandbox.stub(Utils, 'getCauseTypeFromHttpStatus').returns('nee');
      const request = new FetchRequest('https://www.foo.com/test');
      stubFetch.resolves({
        statusCode: 500
      });
      await activeFetch(request);
      stubSubsegment['nee'].should.equal(true);
      utilsCodeStub.should.have.been.calledOnceWith(500);
    });

    it('calls subsegment.addRemoteRequestData with downstreamXRayEnabled set to true on success', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyAddRemoteRequestData.should.have.been.calledOnceWith(clonedRequest, stubValidResponse, true);
      stubClone.restore();
    });

    it('calls subsegment.addRemoteRequestData with downstreamXRayEnabled set to false on success', async function () {
      const activeFetch =  getCaptureFetch(false);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyAddRemoteRequestData.should.have.been.calledOnceWith(clonedRequest, stubValidResponse, false);
      stubClone.restore();
    });

    it('calls subsegment.close on success', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      await activeFetch(request);
      spyClose.should.have.been.calledOnce;
    });

    it('resolves to response on success', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const response = await activeFetch(request);
      response.should.equal(stubValidResponse);
    });

    it('calls subsegmentCallback with error upon fetch throwing', async function () {
      const spyCallback = sandbox.spy();
      const activeFetch =  getCaptureFetch(true, spyCallback);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyCallback.should.have.been.calledOnceWith(stubSubsegment, clonedRequest, undefined, error);
    });

    it('sets subsegment error flag upon fetch throwing', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyAddErrorFlag.should.have.been.calledOnce;
    });

    it('calls addRemoteRequestData upon fetch throwing', async function () {
      const activeFetch =  getCaptureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyAddRemoteRequestData.should.have.been.calledOnceWith(clonedRequest, undefined, true);

    });

    it('calls subsegment close with error upon fetch throwing', async function () {
      const activeFetch =  getCaptureFetch(true);
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
