var expect = require('chai').expect;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var EC2Plugin = require('../../../../lib/segments/plugins/ec2_plugin');
var Plugin = require('../../../../lib/segments/plugins/plugin');

describe('EC2Plugin', function() {
  var data = {
    availabilityZone: 'us-east-1d',
    instanceId: 'i-1234567890abcdef0'
  };

  var getStub, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should return an object holding EC2 metadata if it recieved data', function(done) {
    getStub = sandbox.stub(Plugin, 'getPluginMetadata').yields(null, data);

    EC2Plugin.getData(function(data) {
      getStub.should.have.been.calledOnce;
      expect(data.ec2).not.to.be.empty;
      done();
    });
  });

  it('should return undefined if an error is recieved', function(done) {
    var err = new Error('error');
    getStub = sandbox.stub(Plugin, 'getPluginMetadata').yields(err);

    EC2Plugin.getData(function(data) {
      getStub.should.have.been.calledOnce;
      expect(data).to.be.undefined;
      done();
    });
  });
});
