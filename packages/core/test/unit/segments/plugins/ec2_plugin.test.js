var expect = require('chai').expect;
var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var nock = require('nock');
var rewire = require('rewire');

chai.use(sinonChai);

// Rewired to get access to getToken function
var EC2Plugin = rewire('../../../../lib/segments/plugins/ec2_plugin');
var Plugin = require('../../../../lib/segments/plugins/plugin');

describe('EC2Plugin', function() {
  const HOST = '169.254.169.254';
  const TOKEN = 'fancyToken';

  describe('#getData', function() {
    const data = {
      availabilityZone: 'us-east-1d',
      instanceId: 'i-1234567890abcdef0',
      imageId: 'AL2',
      instanceType: 'm5.xlarge'
    };
    const METADATA_PATH = '/latest/dynamic/instance-identity/document';
    const METADATA_HEADER = {
      'X-aws-ec2-metadata-token': TOKEN
    };

    let sandbox, revert;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
      revert();
    });

    it('should return metadata from IMDSv2 if first requests are successful', function(done) {
      revert = EC2Plugin.__set__('getToken', function(callback) {
        callback(TOKEN);
      });

      let getMetaStub = sandbox
        .stub(Plugin, 'getPluginMetadata')
        .yields(null, data);

      EC2Plugin.getData(function(metadata) {
        const metaOptions = getMetaStub.getCall(0).args[0];

        // getTokenStub.should.have.been.calledOnce;
        getMetaStub.should.have.been.calledOnce;

        // verify all v2 arguments
        assert.equal(metaOptions.host, HOST);
        assert.equal(metaOptions.path, METADATA_PATH);
        assert.deepEqual(metaOptions.headers, METADATA_HEADER);

        // verify correct data received
        assert.equal(metadata.ec2.instance_id, data.instanceId);
        assert.equal(metadata.ec2.availability_zone, data.availabilityZone);
        assert.equal(metadata.ec2.ami_id, data.imageId);
        assert.equal(metadata.ec2.instance_size, data.instanceType);
        done();
      });
    });

    it('should fall back to IMDSv1 if token request fails', function(done) {
      revert = EC2Plugin.__set__('getToken', function(callback) {
        callback(null);
      });

      let getMetaStub = sandbox
        .stub(Plugin, 'getPluginMetadata')
        .yields(null, data);

      EC2Plugin.getData(function(metadata) {
        const metaOptions = getMetaStub.getCall(0).args[0];
        getMetaStub.should.have.been.calledOnce;

        // verify we used v1 args
        assert.equal(metaOptions.host, HOST);
        assert.equal(metaOptions.path, METADATA_PATH);
        assert.deepEqual(metaOptions.headers, {});

        // verify correct data received
        assert.equal(metadata.ec2.instance_id, data.instanceId);
        assert.equal(metadata.ec2.availability_zone, data.availabilityZone);
        assert.equal(metadata.ec2.ami_id, data.imageId);
        assert.equal(metadata.ec2.instance_size, data.instanceType);
        done();
      });
    });

    it('should return undefined if an error is recieved for both versions of IMDS', function(done) {
      revert = EC2Plugin.__set__('getToken', function(callback) {
        callback(null);
      });

      let getMetaStub = sandbox
        .stub(Plugin, 'getPluginMetadata')
        .yields(new Error('MetaError'));

      EC2Plugin.getData(function(data) {
        getMetaStub.should.have.been.calledOnce;
        expect(data).to.be.undefined;
        done();
      });
    });
  });

  describe('#getToken', function() {
    let getToken = EC2Plugin.__get__('getToken');
    let getTokenRequest;
    const TOKEN_HOST = `http://${HOST}`;
    const TOKEN_PATH = '/latest/api/token';

    it('should return token on 200 OK', function(done) {
      getTokenRequest = nock(TOKEN_HOST)
        .put(TOKEN_PATH)
        .reply(200, TOKEN);

      getToken(function(data) {
        assert.equal(data, TOKEN);
        getTokenRequest.done();
        done();
      });
    });

    it('should return null on 4xx', function(done) {
      getTokenRequest = nock(TOKEN_HOST)
        .put(TOKEN_PATH)
        .reply(400);

      getToken(function(data) {
        assert.isNull(data);
        getTokenRequest.done();
        done();
      });
    });
  });
});
