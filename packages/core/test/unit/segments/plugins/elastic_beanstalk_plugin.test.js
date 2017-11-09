var expect = require('chai').expect;
var fs = require('fs');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var ElasticBeanstalkPlugin = require('../../../../lib/segments/plugins/elastic_beanstalk_plugin');

describe('ElasticBeanstalkPlugin', function() {
  var err = new Error('Cannot load file.');
  var data = {
    deployment_id: 'deployment_id',
    version_label: 'version_label',
    environment_name: 'my_env'
  };

  var readStub, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should return an object holding Beanstalk metadata if it read data', function(done) {
    readStub = sandbox.stub(fs, 'readFile').yields(null, data);
    sandbox.stub(JSON, 'parse').returns(data);

    ElasticBeanstalkPlugin.getData(function(data) {
      readStub.should.have.been.calledOnce;
      expect(data.elastic_beanstalk).not.to.be.empty;
      done();
    });
  });

  it('should return undefined if the read fails', function(done) {
    readStub = sandbox.stub(fs, 'readFile').yields(err, null);

    ElasticBeanstalkPlugin.getData(function(data) {
      readStub.should.have.been.calledOnce;
      expect(data).to.be.undefined;
      done();
    });
  });
});
