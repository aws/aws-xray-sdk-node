var expect = require('chai').expect;
var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var EC2Plugin = require('../../../../lib/segments/plugins/ec2_plugin');
var Plugin = require('../../../../lib/segments/plugins/plugin');

describe('EC2Plugin', function() {
  const data = {
    availabilityZone: 'us-east-1d',
    instanceId: 'i-1234567890abcdef0'
  };
  const HOST = '169.254.169.254';
  const TOKEN_PATH = '/latest/api/token';
  const METADATA_PATH = '/latest/dynamic/instance-identity/document';
  const TOKEN = 'fancyToken';
  const METADATA_HEADER = {
    'X-aws-ec2-metadata-token': TOKEN
  };

  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should return metadata from IMDSv2 if first requests are successful', function(done) {
    let getTokenStub = sandbox.stub(Plugin, 'getToken').yields(null, TOKEN);
    let getMetaStub = sandbox.stub(Plugin, 'getPluginMetadata').yields(null, data);
    

    EC2Plugin.getData(function(metadata) {
      const tokenOptions = getTokenStub.getCall(0).args[0];
      const metaOptions = getMetaStub.getCall(0).args[0];

      getTokenStub.should.have.been.calledOnce;
      getMetaStub.should.have.been.calledOnce;
      
      // verify all v2 arguments
      assert.equal(tokenOptions.host, HOST);
      assert.equal(tokenOptions.path, TOKEN_PATH);
      assert.equal(metaOptions.host, HOST);
      assert.equal(metaOptions.path, METADATA_PATH);
      assert.deepEqual(metaOptions.headers, METADATA_HEADER);

      // verify correct data received
      assert.equal(metadata.ec2.instance_id, data.instanceId);
      assert.equal(metadata.ec2.availability_zone, data.availabilityZone);
      done();
    });
  });

  it('should fall back to IMDSv1 if token request fails', function(done) {
    let getTokenStub = sandbox.stub(Plugin, 'getToken').yields(new Error('tokenError'));
    let getMetaStub = sandbox.stub(Plugin, 'getPluginMetadata').yields(null, data);

    EC2Plugin.getData(function(metadata) {
      const metaOptions = getMetaStub.getCall(0).args[0];
      getTokenStub.should.have.been.calledOnce;
      getMetaStub.should.have.been.calledOnce;

      // verify we used v1 args
      assert.equal(metaOptions.host, HOST);
      assert.equal(metaOptions.path, METADATA_PATH);
      assert.deepEqual(metaOptions.headers, {});

      // verify correct data received
      assert.equal(metadata.ec2.instance_id, data.instanceId);
      assert.equal(metadata.ec2.availability_zone, data.availabilityZone);
      done();
    });
  });

  it('should fall back to IMDSv1 if IMDSv2 metadata request fails', function(done) {
    let getTokenStub = sandbox.stub(Plugin, 'getToken').yields(null, TOKEN);
    let getMetaStub = sandbox.stub(Plugin, 'getPluginMetadata');
    getMetaStub.onCall(0).yields(new Error('MetaError'));
    getMetaStub.onCall(1).yields(null, data);

    EC2Plugin.getData(function(metadata) {
      const metaOptions1 = getMetaStub.getCall(0).args[0];
      const metaOptions2 = getMetaStub.getCall(1).args[0];
      getTokenStub.should.have.been.calledOnce;
      getMetaStub.should.have.been.calledTwice;

      // verify we used v2 args on second request
      assert.equal(metaOptions1.host, HOST);
      assert.equal(metaOptions1.path, METADATA_PATH);
      assert.deepEqual(metaOptions1.headers, METADATA_HEADER);

      // verify we used v1 args on second request
      assert.equal(metaOptions2.host, HOST);
      assert.equal(metaOptions2.path, METADATA_PATH);
      assert.deepEqual(metaOptions2.headers, {});

      // verify correct data received
      assert.equal(metadata.ec2.instance_id, data.instanceId);
      assert.equal(metadata.ec2.availability_zone, data.availabilityZone);
      done();
    });
  });

  it('should return undefined if an error is recieved for both versions of IMDS', function(done) {
    let getTokenStub = sandbox.stub(Plugin, 'getToken').yields(null, TOKEN);
    let getMetaStub = sandbox.stub(Plugin, 'getPluginMetadata').yields(new Error('MetaError'));

    EC2Plugin.getData(function(data) {
      getTokenStub.should.have.been.calledOnce;
      getMetaStub.should.have.been.calledTwice;
      expect(data).to.be.undefined;
      done();
    });
  });
});
