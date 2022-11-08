const assert = require('chai').assert;
const chai = require('chai');
const EventEmitter = require('events');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const util = require('util');

const Aws = require('../../../lib/segments/attributes/aws');
const awsPatcher = require('../../../lib/patchers/aws_p');
const contextUtils = require('../../../lib/context_utils');
const Segment = require('../../../lib/segments/segment');
const Utils = require('../../../lib/utils');

const logger = require('../../../lib/logger').getLogger();

chai.should();
chai.use(sinonChai);

const traceId = '1-57fbe041-2c7ad569f5d6ff149137be86';

describe('AWS patcher', function () {
  describe('#captureAWS', function () {
    let customStub, sandbox;

    const awssdk = {
      VERSION: '2.7.15',
      s3: {
        prototype: {
          customizeRequests: function () {}
        },
        serviceIdentifier: 's3'
      }
    };

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      customStub = sandbox.stub(awssdk.s3.prototype, 'customizeRequests');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call customizeRequests and return the sdk', function () {
      const patched = awsPatcher.captureAWS(awssdk);
      customStub.should.have.been.calledOnce;
      assert.equal(patched, awssdk);
    });

    it('should throw an error if the AWSSDK is below the minimum required version', function () {
      awssdk.VERSION = '1.2.5';
      assert.throws(function () {
        awsPatcher.captureAWS(awssdk);
      }, Error);
    });
  });

  describe('#captureAWSClient', function () {
    let customStub, sandbox;

    const awsClient = {
      customizeRequests: function () {}
    };

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      customStub = sandbox.stub(awsClient, 'customizeRequests');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call customizeRequests and return the service', function () {
      const patched = awsPatcher.captureAWSClient(awsClient);
      customStub.should.have.been.calledOnce;
      assert.equal(patched, awsClient);
    });
  });

  describe('#captureAWSRequest', function () {
    let awsClient, awsRequest, MyEmitter, sandbox, segment, stubResolve, stubResolveManual, sub;

    before(function () {
      MyEmitter = function () {
        EventEmitter.call(this);
      };

      awsClient = {
        customizeRequests: function customizeRequests (captureAWSRequest) {
          this.call = captureAWSRequest;
        },
        throttledError: function throttledError () {}
      }
      awsClient = awsPatcher.captureAWSClient(awsClient);

      util.inherits(MyEmitter, EventEmitter);
    });

    beforeEach(function () {
      sandbox = sinon.createSandbox();

      awsRequest = {
        httpRequest: {
          method: 'GET',
          url: '/',
          connection: {
            remoteAddress: 'localhost'
          },
          headers: {}
        },
        response: {}
      };

      awsRequest.on = function (event, fcn) {
        if (event === 'complete') {
          this.emitter.on(event, fcn.bind(this, this.response));
        } else {
          this.emitter.on(event, fcn.bind(this, this));
        }
        return this;
      };

      awsRequest.emitter = new MyEmitter();

      segment = new Segment('testSegment', traceId);
      sub = segment.addNewSubsegment('subseg');

      stubResolveManual = sandbox.stub(contextUtils, 'resolveManualSegmentParams');
      stubResolve = sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      sandbox.stub(segment, 'addNewSubsegment').returns(sub);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call to resolve any manual params', function () {
      awsClient.call(awsRequest);

      stubResolveManual.should.have.been.calledWith(awsRequest.params);
    });

    it('should log an info statement and exit if parent is not found on the context or on the call params', function (done) {
      stubResolve.returns();
      const logStub = sandbox.stub(logger, 'info');

      awsClient.call(awsRequest);

      setTimeout(function () {
        logStub.should.have.been.calledOnce;
        done();
      }, 50);
    });

    it('should inject the tracing headers', function (done) {
      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);

      awsClient.call(awsRequest);

      awsRequest.emitter.emit('build');

      setTimeout(function () {
        const expected = new RegExp('^Root=' + traceId + ';Parent=' + sub.id + ';Sampled=1$');
        assert.match(awsRequest.httpRequest.headers['X-Amzn-Trace-Id'], expected);
        done();
      }, 50);
    });

    it('should close on complete with no errors when code 200 is seen', function (done) {
      const closeStub = sandbox.stub(sub, 'close').returns();
      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      sandbox.stub(sub, 'addAttribute').returns();
      sandbox.stub(Aws.prototype, 'init').returns();

      awsRequest.response = {
        httpResponse: { statusCode: 200 }
      };

      awsClient.call(awsRequest);

      awsRequest.emitter.emit('complete');

      setTimeout(function () {
        closeStub.should.have.been.calledWithExactly();
        done();
      }, 50);
    });

    it('should mark the subsegment as throttled and error if code 429 is seen', function (done) {
      const throttleStub = sandbox.stub(sub, 'addThrottleFlag').returns();

      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      sandbox.stub(sub, 'addAttribute').returns();
      sandbox.stub(Aws.prototype, 'init').returns();

      awsRequest.response = {
        error: { message: 'throttling', code: 'ThrottlingError' },
        httpResponse: { statusCode: 429 }
      };

      awsClient.call(awsRequest);

      awsRequest.emitter.emit('complete');

      setTimeout(function () {
        throttleStub.should.have.been.calledOnce;
        assert.isTrue(sub.error);
        done();
      }, 50);
    });

    it('should mark the subsegment as throttled and error if code service.throttledError returns true, regardless of status code', function (done) {
      const throttledCheckStub = sandbox.stub(awsClient, 'throttledError').returns(true);
      const throttleStub = sandbox.stub(sub, 'addThrottleFlag').returns();

      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      sandbox.stub(sub, 'addAttribute').returns();
      sandbox.stub(Aws.prototype, 'init').returns();

      awsRequest.response = {
        error: { message: 'throttling', code: 'ProvisionedThroughputException' },
        httpResponse: { statusCode: 400 }
      };

      awsClient.call(awsRequest);

      awsRequest.emitter.emit('complete');

      setTimeout(function () {
        throttledCheckStub.should.have.been.calledOnce;
        throttleStub.should.have.been.calledOnce;
        assert.isTrue(sub.error);
        done();
      }, 50);
    });

    it('should capture an error on the response and mark exception as remote', function (done) {
      const closeStub = sandbox.stub(sub, 'close').returns();
      const getCauseStub = sandbox.stub(Utils, 'getCauseTypeFromHttpStatus').returns();

      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      sandbox.stub(sub, 'addAttribute').returns();
      sandbox.stub(Aws.prototype, 'init').returns();

      const error = { message: 'big error', code: 'Error' };

      awsRequest.response.error = error;
      awsRequest.response.httpResponse = { statusCode: 500 };

      awsClient.call(awsRequest);

      awsRequest.emitter.emit('complete');

      setTimeout(function () {
        getCauseStub.should.have.been.calledWithExactly(awsRequest.response.httpResponse.statusCode);
        closeStub.should.have.been.calledWithExactly(sinon.match({ message: error.message, name: error.code }), true);
        done();
      }, 50);
    });
  });

  describe('#captureAWSRequest-Unsampled', function () {
    let awsClient, awsRequest, MyEmitter, sandbox, segment, stubResolve, stubResolveManual, sub;

    before(function () {
      MyEmitter = function () {
        EventEmitter.call(this)
      }

      awsClient = {
        customizeRequests: function customizeRequests (captureAWSRequest) {
          this.call = captureAWSRequest;
        },
        throttledError: function throttledError () {}
      }
      awsClient = awsPatcher.captureAWSClient(awsClient);

      util.inherits(MyEmitter, EventEmitter);
    })

    beforeEach(function () {
      sandbox = sinon.createSandbox();

      awsRequest = {
        httpRequest: {
          method: 'GET',
          url: '/',
          connection: {
            remoteAddress: 'localhost'
          },
          headers: {}
        },
        response: {}
      };

      awsRequest.on = function (event, fcn) {
        if (event === 'complete') {
          this.emitter.on(event, fcn.bind(this, this.response));
        } else {
          this.emitter.on(event, fcn.bind(this, this));
        }
        return this;
      };

      awsRequest.emitter = new MyEmitter();

      segment = new Segment('testSegment', traceId);
      sub = segment.addNewSubsegmentWithoutSampling('subseg');

      stubResolveManual = sandbox.stub(contextUtils, 'resolveManualSegmentParams');
      stubResolve = sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      sandbox.stub(segment, 'addNewSubsegmentWithoutSampling').returns(sub);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should log an info statement and exit if parent is not found on the context or on the call params', function (done) {
      stubResolve.returns();
      const logStub = sandbox.stub(logger, 'info');

      awsClient.call(awsRequest);

      setTimeout(function () {
        logStub.should.have.been.calledOnce;
        done();
      }, 50);
    });

    it('should inject the tracing headers', function (done) {
      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);

      awsClient.call(awsRequest);

      awsRequest.emitter.emit('build');

      setTimeout(function () {
        const expected = new RegExp('^Root=' + traceId + ';Parent=' + sub.id + ';Sampled=0$');
        assert.match(awsRequest.httpRequest.headers['X-Amzn-Trace-Id'], expected);
        done();
      }, 50);
    });
  });
});
