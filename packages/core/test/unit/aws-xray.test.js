var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var segmentUtils = require('../../lib/segments/segment_utils');

chai.should();
chai.use(sinonChai);

describe('AWSXRay', function() {
  var AWSXRay;

  describe('on load', function() {
    var sandbox, setSDKDataStub, setServiceDataStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      setSDKDataStub = sandbox.stub(segmentUtils, 'setSDKData');
      setServiceDataStub = sandbox.stub(segmentUtils, 'setServiceData');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should set the segmentUtils version and SDK version', function() {
      AWSXRay = require('../../lib/index');

      setSDKDataStub.should.have.been.calledWithExactly(sinon.match.object);
      setServiceDataStub.should.have.been.calledWithExactly(sinon.match.object);

      assert.property(setSDKDataStub.firstCall.args[0], 'sdk');
      assert.property(setSDKDataStub.firstCall.args[0], 'sdk_version');
      assert.property(setSDKDataStub.firstCall.args[0], 'package');

      assert.property(setServiceDataStub.firstCall.args[0], 'runtime');
      assert.property(setServiceDataStub.firstCall.args[0], 'runtime_version');
      assert.property(setServiceDataStub.firstCall.args[0], 'name');
      assert.property(setServiceDataStub.firstCall.args[0], 'version');
    });
  });

  describe('#config', function() {
    var sandbox, setOriginStub, setPluginDataStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      setPluginDataStub = sandbox.stub(segmentUtils, 'setPluginData');
      setOriginStub = sandbox.stub(segmentUtils, 'setOrigin');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should load the given plugins and set the data on segmentUtils', function(done) {
      var data = { client: 'data' };
      var pluginStub = {
        getData: function(callback) {
          callback(data);
        }
      };
      AWSXRay.config([pluginStub]);

      setTimeout(function() {
        setPluginDataStub.should.have.been.calledWithExactly(data);
        done();
      }, 50);
    });

    it('should set segmentUtils origin to beanstalk if beanstalk plugin was loaded', function(done) {
      var pluginStub = {
        getData: function(callback) {
          callback('data');
        },
        originName: 'AWS::ElasticBeanstalk::Environment'
      };
      AWSXRay.config([pluginStub]);

      setTimeout(function() {
        setOriginStub.should.have.been.calledWithExactly('AWS::ElasticBeanstalk::Environment');
        done();
      }, 50);
    });
  });
});
