const AWSXray = require('aws-xray-sdk-core');
const sinon = require('sinon');

const sandbox = sinon.createSandbox();
const spyLogWarn = sandbox.spy();
const spyLogInfo = sandbox.spy();

sandbox.stub(AWSXray, 'getLogger').returns({
  warn: spyLogWarn,
  info: spyLogInfo
});

const stubResolveSegment = sandbox.stub(AWSXray, 'resolveSegment');
const stubResolveManualSegmentParams = sandbox.stub(AWSXray, 'resolveManualSegmentParams');
const stubIsAutomaticMode = sandbox.stub(AWSXray, 'isAutomaticMode');

afterEach(() => {
  sandbox.resetHistory();
  // We have to create and re-create this stub here because promise_p.test doesn't use sandboxes
  // stubIsAutomaticMode.returns(true);
});

module.exports.AWSXray = AWSXray;
module.exports.sandbox = sandbox;
module.exports.spyLogWarn = spyLogWarn;
module.exports.spyLogInfo = spyLogInfo;
module.exports.stubResolveSegment = stubResolveSegment;
module.exports.stubResolveManualSegmentParams = stubResolveManualSegmentParams;
module.exports.stubIsAutomaticMode = stubIsAutomaticMode;
