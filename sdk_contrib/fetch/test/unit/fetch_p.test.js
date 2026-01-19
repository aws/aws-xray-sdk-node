const { Subsegment } = require('aws-xray-sdk-core');
const fetch = require('node-fetch');

describe('Unit tests', function () {

  const chai = require('chai');
  const chaiAsPromised = require('chai-as-promised');
  const sinonChai = require('sinon-chai');
  const sinon = require('sinon');

  const global = require('../global');
  const AWSXray = global.AWSXray;
  const sandbox = global.sandbox;
  const spyLogWarn = global.spyLogWarn;
  const spyLogInfo = global.spyLogInfo;
  const stubResolveSegment = global.stubResolveSegment;
  const stubResolveManualSegmentParams = global.stubResolveManualSegmentParams;
  const stubIsAutomaticMode = global.stubIsAutomaticMode;

  const utils = AWSXray.utils;

  const fetchModule = require('node-fetch');
  const { captureFetchGlobal, captureFetchModule } = require('../../lib/fetch_p');

  chai.should();
  chai.use(sinonChai);
  chai.use(chaiAsPromised);

  const globalFetchAvailable = 'fetch' in globalThis;

  // These unit tests need to work across NodeJS versions that
  // do and do not include fetch built-in
  describe('capture functions', function () {

    let saveGlobalFetch;
    let saveModuleFetch;

    beforeEach(function () {
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

    let FetchRequest;
    let saveFetch;
    let stubFetch;
    let stubValidResponse;
    let stubParentSegment;
    let stubSubsegment;
    let stubAddNewSubsegmentWithoutSampling;
    let stubAddNewSubsegment;
    let spyAddFetchRequestData;
    let spyAddErrorFlag;
    let spyAddThrottleFlag;
    let spyClose;

    const useGlobalFetch = globalFetchAvailable;
    const captureFetch = useGlobalFetch
      ? (downstreamXRayEnabled, subsegmentCallback) => captureFetchGlobal(downstreamXRayEnabled, subsegmentCallback)
      : (downstreamXRayEnabled, subsegmentCallback) => captureFetchModule(fetchModule, downstreamXRayEnabled, subsegmentCallback);

    beforeEach(function () {
      stubValidResponse = {
        statusCode: 200,
        status: 'OK'
      };

      stubSubsegment = sandbox.stub();
      spyAddFetchRequestData = sandbox.spy();
      stubSubsegment.addFetchRequestData = spyAddFetchRequestData;
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
    });

    this.afterEach(function () {
      if (useGlobalFetch) {
        delete globalThis.__fetch;
        globalThis.fetch = saveFetch;
      } else {
        delete fetchModule.__fetch;
        fetchModule.fetch = saveFetch;
      }
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
      stubIsAutomaticMode.returns(true);
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
      sandbox.stub(request, 'method').get(sandbox.stub().returns(undefined));
      await activeFetch(request);
      spyLogInfo.should.have.been.calledOnceWith('RequestInit for request [ host: www.foo.com, path: /test ] requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
      stubFetch.should.have.been.calledOnceWith(request);
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
      sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyCallback.should.have.been.calledOnceWith(stubSubsegment, clonedRequest, stubValidResponse);
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

    it('calls subsegment.addFetchRequestData with downstreamXRayEnabled set to true on success', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyAddFetchRequestData.should.have.been.calledOnceWith(clonedRequest, stubValidResponse, true);
    });

    it('calls subsegment.addFetchRequestData with downstreamXRayEnabled set to false on success', async function () {
      const activeFetch = captureFetch(false);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      const stubClone = sandbox.stub(request, 'clone').returns(clonedRequest);
      await activeFetch(request);
      spyAddFetchRequestData.should.have.been.calledOnceWith(clonedRequest, stubValidResponse, false);
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

    it('calls addFetchRequestData upon fetch throwing', async function () {
      const activeFetch = captureFetch(true);
      const request = new FetchRequest('https://www.foo.com/test');
      const clonedRequest = request.clone();
      sandbox.stub(request, 'clone').returns(clonedRequest);
      const error = new Error('Nee!');
      stubFetch.rejects(error);
      await activeFetch(request).should.eventually.be.rejectedWith('Nee!');
      spyAddFetchRequestData.should.have.been.calledOnceWith(clonedRequest, undefined, true);

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

  describe('Subsegment addFetchRequestData', () => {

    it('adds request URL and method', async () => {
      const subsegment = new Subsegment('test');
      const request = new fetch.Request('https://foo.com', {
        method: 'POST'
      });
      subsegment.addFetchRequestData(request, null, false);
      subsegment.http.should.deep.equal({
        request: {
          url: 'https://foo.com/',
          method: 'POST'
        }
      });
    });

    it('defaults url and method to empty string if missing', async () => {
      const subsegment = new Subsegment('test');
      subsegment.addFetchRequestData({}, null, false);
      subsegment.http.should.deep.equal({
        request: {
          url: '',
          method: ''
        }
      });
    });


    it('sets request.traced when downstreamXRayEnabled is true', () => {
      const subsegment = new Subsegment('test');
      const request = new fetch.Request('https://foo.com', {
        method: 'POST'
      });
      subsegment.addFetchRequestData(request, null, true);
      subsegment.traced.should.equal(true);
    });

    it('sets response.status', () => {
      const subsegment = new Subsegment('test');
      const request = new fetch.Request('https://foo.com', {
        method: 'POST'
      });
      const response = new fetch.Response(undefined, {
        status: 200
      });
      subsegment.addFetchRequestData(request, response, false);
      subsegment.http.should.deep.equal({
        request: {
          url: 'https://foo.com/',
          method: 'POST'
        },
        response: {
          status: 200
        },
      });
    });

    it('sets response.content_length', () => {
      const subsegment = new Subsegment('test');
      const request = new fetch.Request('https://foo.com', {
        method: 'POST'
      });
      const response = new fetch.Response(undefined, {
        status: 200,
        headers: new fetch.Headers({
          'content-length': 100
        })
      });
      subsegment.addFetchRequestData(request, response, false);
      subsegment.http.should.deep.equal({
        request: {
          url: 'https://foo.com/',
          method: 'POST'
        },
        response: {
          status: 200,
          content_length: 100
        },
      });
    });
  });
});
