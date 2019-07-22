var assert = require('chai').assert;
var Aws = require('../../../../lib/segments/attributes/aws');
var CallCapturer = require('../../../../lib/patchers/call_capturer.js');
var sinon = require('sinon');

describe('Aws', function() {
  var serviceName = 's3';
  var bucketName = 'test-bucket';
  var keyName = 'test-key';
  var req = {
    request: {
      operation: 'putObject',
      httpRequest: {
        region: 'us-east-1'
      },
      params: {
        Bucket: bucketName,
        Key: keyName
      }
    },
    requestId: 'C9336616C948DC3C',
    retryCount: 3
  };

  describe('#init', function() {
    var sandbox, addDataStub;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      addDataStub = sandbox.stub(Aws.prototype, 'addData');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should create a new Aws object', function() {
      var aws = new Aws(req, serviceName);
      assert.isObject(aws);
    });

    it('should capture the request ID but not the extendedRequestId', function() {
      var aws = new Aws(req, serviceName);
      assert.propertyVal(aws, 'request_id', req.requestId);
      assert.notProperty(aws, 'id_2');
    });

    it('should capture the special S3 extendedRequestId (x-amz-id-2 header) if set', function() {
      req.extendedRequestId = 'AzVdR5vxfKlTwI7SMKu+suvQRfzGrzDtZRy3dU7Te6vbFx/R18U0I/ndTmLfA78sVxgfRo0lDMQ=';
      var aws = new Aws(req, serviceName);

      assert.propertyVal(aws, 'id_2', req.extendedRequestId);
    });

    it('should format the operation name', function() {
      var aws = new Aws(req, serviceName);
      assert.propertyVal(aws, 'operation', 'PutObject');
    });

    it('should capture s3 params: bucket, key', function() {
      new Aws(req, serviceName);
      addDataStub.should.have.been.calledWith({
        bucket_name: bucketName,
        key: keyName
      });
    });
  });

  describe('#addData', function() {
    it('should append the data to the Aws object', function() {
      var aws = new Aws(req, serviceName);
      var data1 = { moop: { key: 'value2' } };
      var data2 = { boop: { key: 'value1' } };
      aws.addData(data1);
      aws.addData(data2);

      assert.deepEqual(aws.moop, data1.moop);
      assert.deepEqual(aws.boop, data2.boop);
    });
  });

  describe('class functions', function() {
    var capturerAppendStub, capturerInitStub, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      capturerInitStub = sandbox.stub(CallCapturer.prototype, 'init');
      capturerAppendStub = sandbox.stub(CallCapturer.prototype, 'append');
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('setAWSWhitelist', function() {
      it('should accept a string for location', function() {
        var location = '/path/here';
        Aws.setAWSWhitelist(location);
        capturerInitStub.should.have.been.calledWith(location);
      });

      it('should accept a source object', function() {
        var source = {};
        Aws.setAWSWhitelist(source);
        capturerInitStub.should.have.been.calledWith(source);
      });

      it('should throw an error on bad values', function() {
        assert.throws(function() { Aws.setAWSWhitelist(); });
        assert.throws(function() { Aws.setAWSWhitelist(null); });
        assert.throws(function() { Aws.setAWSWhitelist(0); });
        assert.throws(function() { Aws.setAWSWhitelist(new String('')); });
      });
    });

    describe('appendAWSWhitelist', function() {
      it('should accept a string for location', function() {
        var location = '/path/here';
        Aws.appendAWSWhitelist(location);
        capturerAppendStub.should.have.been.calledWith(location);
      });

      it('should accept a source object', function() {
        var source = {};
        Aws.appendAWSWhitelist(source);
        capturerAppendStub.should.have.been.calledWith(source);
      });

      it('should throw an error on bad values', function() {
        assert.throws(function() { Aws.appendAWSWhitelist(); });
        assert.throws(function() { Aws.appendAWSWhitelist(null); });
        assert.throws(function() { Aws.appendAWSWhitelist(0); });
        assert.throws(function() { Aws.setAWSWhitelist(new String('')); });
      });
    });
  });
});
