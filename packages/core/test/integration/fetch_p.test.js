var sinon = require('sinon');

var contextUtils = require('../../lib/context_utils');
const fetchModule = require('node-fetch');
const captureFetch = require('../../lib/patchers/fetch_p').captureFetch;
const Segment = require('../../lib/segments/segment');
const Subsegment = require('../../lib/segments/attributes/subsegment');

describe('node-fetch', function () {
  const goodUrl = 'https://example.org';
  const badUrl = 'http://localhost:1';

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
    saveGlobalFetch = globalThis.fetch;
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
    globalThis.fetch = saveGlobalFetch;
    delete globalThis.__fetch;
    delete fetchModule.__fetch;

    sandbox.restore();
    sandbox.resetHistory();
  });

  it('should retrieve content and call AddRemoteRequestData', async function () {
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

  it('should set error flag on failed fetch', async function () {
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
