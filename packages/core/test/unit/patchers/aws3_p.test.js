var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var Aws = require('../../../lib/segments/attributes/aws');
var awsPatcher = require('../../../lib/patchers/aws3_p');
var contextUtils = require('../../../lib/context_utils');
var Segment = require('../../../lib/segments/segment');
var Utils = require('../../../lib/utils');

var { constructStack } = require('@aws-sdk/middleware-stack');

var logger = require('../../../lib/logger').getLogger();

chai.should();
chai.use(sinonChai);

var traceId = '1-57fbe041-2c7ad569f5d6ff149137be86';

describe('AWS v3 patcher', function() {
  describe('#captureAWSClient', function() {
    var sandbox, useMiddleware;

    var awsClient = {
      send: function() {},
      config: {
        serviceId: 's3',
      },
      middlewareStack: constructStack(),
    };

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      useMiddleware = sandbox.stub(awsClient.middlewareStack, 'use');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call middlewareStack.use and return the service', function() {
      const patched = awsPatcher.captureAWSClient(awsClient);
      useMiddleware.should.have.been.calledOnce;
      assert.equal(patched, awsClient);
    });
  });

  describe('#captureAWSRequest', function() {
    var awsClient, awsRequest, sandbox, segment, stubResolve, addNewSubsegmentStub, sub;

    before(function() {
      awsClient = {
        send: async (req) => {
          const context = {
            clientName: 'S3Client',
            commandName: 'ListBucketsCommand',
          };
          const handler = awsClient.middlewareStack.resolve((args) => {
            const error = req.response.error;
            if (error) {
              const err = new Error(error.message);
              err.name = error.code;
              err.$metadata = req.response.$metadata;
              throw err;
            }
            return args;
          }, context);
          await handler(req);
          return req.response;
        },
        config: {
          region: async () => 'us-east-1',
        },
        middlewareStack: constructStack(),
      };
    });

    beforeEach(function() {
      sandbox = sinon.createSandbox();

      awsRequest = new (class ListBucketsCommand {
        constructor() {
          this.request = {
            method: 'GET',
            url: '/',
            connection: {
              remoteAddress: 'localhost'
            },
            headers: {}
          };
          this.response = {};
          this.output = {
            $metadata: {
              requestId: '123',
              extendedRequestId: '456',
            }
          };
        }
      })();

      segment = new Segment('testSegment', traceId);
      sub = segment.addNewSubsegment('subseg');
      stubResolve = sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      addNewSubsegmentStub = sandbox.stub(segment, 'addNewSubsegment').returns(sub);
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('#automaticMode', () => {
      beforeEach(() => {
        sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      });

      before(() => {
        awsClient = awsPatcher.captureAWSClient(awsClient);
      });

      it('should log an info statement and exit if parent is not found in the context for automatic mode', (done) => {
        stubResolve.returns();
        const logStub = sandbox.stub(logger, 'info');

        awsClient.send(awsRequest);

        setTimeout(function() {
          logStub.should.have.been.calledOnce;
          done();
        }, 50);
      });

      it('should inject the tracing headers', async function() {
        await awsClient.send(awsRequest);
        assert.isTrue(addNewSubsegmentStub.calledWith('S3'));


        const expected = new RegExp('^Root=' + traceId + ';Parent=' + sub.id + ';Sampled=1$');
        assert.match(awsRequest.request.headers['X-Amzn-Trace-Id'], expected);
      });

      it('should close on complete with no errors when code 200 is seen', async function() {
        const closeStub = sandbox.stub(sub, 'close').returns();
        sandbox.stub(sub, 'addAttribute').returns();
        sandbox.stub(Aws.prototype, 'init').returns();

        awsRequest.response = {
          $metadata: { httpStatusCode: 200 },
        };

        await awsClient.send(awsRequest);

        closeStub.should.have.been.calledWithExactly();
      });

      it('should mark the subsegment as throttled and error if code 429 is seen', async function() {
        const throttleStub = sandbox.stub(sub, 'addThrottleFlag').returns();

        sandbox.stub(sub, 'addAttribute').returns();
        sandbox.stub(Aws.prototype, 'init').returns();

        awsRequest.response = {
          error: { message: 'throttling', code: 'ThrottlingError' },
          $metadata: { httpStatusCode: 429 },
        };

        await awsClient.send(awsRequest).catch(() => null);

        throttleStub.should.have.been.calledOnce;
        assert.isTrue(sub.error);
      });

      it('should mark the subsegment as throttled and error if code service.throttledError returns true, regardless of status code', async function() {
        const throttleStub = sandbox.stub(sub, 'addThrottleFlag').returns();

        sandbox.stub(sub, 'addAttribute').returns();
        sandbox.stub(Aws.prototype, 'init').returns();

        awsRequest.response = {
          error: { message: 'throttling', code: 'ProvisionedThroughputExceededException' },
          $metadata: { httpStatusCode: 400 },
        };

        await awsClient.send(awsRequest).catch(() => null);

        throttleStub.should.have.been.calledOnce;
        assert.isTrue(sub.error);
      });

      it('should capture an error on the response and mark exception as remote', async function() {
        const closeStub = sandbox.stub(sub, 'close').returns();
        const getCauseStub = sandbox.stub(Utils, 'getCauseTypeFromHttpStatus').returns();

        sandbox.stub(sub, 'addAttribute').returns();
        sandbox.stub(Aws.prototype, 'init').returns();

        const error = { message: 'big error', code: 'Error' };

        awsRequest.response = {
          error,
          $metadata: { httpStatusCode: 500 },
        };

        await awsClient.send(awsRequest).catch(() => null);

        getCauseStub.should.have.been.calledWithExactly(500);
        closeStub.should.have.been.calledWithExactly(sinon.match({ message: error.message, name: error.code}), true);
      });
    });

    describe('#manualMode', () => {
      beforeEach(() => {
        sandbox.stub(contextUtils, 'isAutomaticMode').returns(false);
      });

      it('should log an info statement and exit if parent is not found in the context for manual mode', (done) => {
        awsClient = awsPatcher.captureAWSClient(awsClient);
        var logStub = sandbox.stub(logger, 'info');

        awsClient.send(awsRequest);

        setTimeout(function() {
          logStub.should.have.been.calledOnce;
          done();
        }, 50);
      });

      it('should use the provided parent segment', () => {
        awsClient = awsPatcher.captureAWSClient(awsClient, segment);

        awsClient.send(awsRequest);

        assert.isTrue(addNewSubsegmentStub.calledWith('S3'));
      });

      it('should handle several calls to capture', () => {
        const otherSeg = new Segment('otherTest');
        const otherAddNewStub = sandbox.stub(otherSeg, 'addNewSubsegment');

        awsClient = awsPatcher.captureAWSClient(awsClient, segment);
        awsClient.send(awsRequest);
        assert.isTrue(addNewSubsegmentStub.calledWith('S3'));

        awsClient = awsPatcher.captureAWSClient(awsClient, otherSeg);
        awsClient.send(awsRequest);
        assert.isTrue(otherAddNewStub.calledWith('S3'));
      });
    });
  });


  describe('#captureAWSRequest-Unsampled', function() {
    var awsClient, awsRequest, sandbox, segment, stubResolve, addNewSubsegmentStub, sub, service, addNewServiceSubsegmentStub;

    before(function() {
      awsClient = {
        send: async (req) => {
          const context = {
            clientName: 'S3Client',
            commandName: 'ListBucketsCommand',
          };
          const handler = awsClient.middlewareStack.resolve((args) => {
            const error = req.response.error;
            if (error) {
              const err = new Error(error.message);
              err.name = error.code;
              err.$metadata = req.response.$metadata;
              throw err;
            }
            return args;
          }, context);
          await handler(req);
          return req.response;
        },
        config: {
          region: async () => 'us-east-1',
        },
        middlewareStack: constructStack(),
      };
    });

    beforeEach(function() {
      sandbox = sinon.createSandbox();

      awsRequest = new (class ListBucketsCommand {
        constructor() {
          this.request = {
            method: 'GET',
            url: '/',
            connection: {
              remoteAddress: 'localhost'
            },
            headers: {}
          };
          this.response = {};
          this.output = {
            $metadata: {
              requestId: '123',
              extendedRequestId: '456',
            }
          };
        }
      })();

      segment = new Segment('testSegment', traceId);
      sub = segment.addNewSubsegmentWithoutSampling('subseg');
      service = sub.addNewSubsegmentWithoutSampling('service');

      stubResolve = sandbox.stub(contextUtils, 'resolveSegment').returns(sub);
      addNewSubsegmentStub = sandbox.stub(segment, 'addNewSubsegmentWithoutSampling').returns(sub);
      addNewServiceSubsegmentStub = sandbox.stub(sub, 'addNewSubsegmentWithoutSampling').returns(service);

    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('#automaticMode', () => {
      beforeEach(() => {
        sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      });

      before(() => {
        awsClient = awsPatcher.captureAWSClient(awsClient);
      });


      it('should inject the tracing headers', async function() {
        await awsClient.send(awsRequest);
        assert.isTrue(addNewServiceSubsegmentStub.calledWith('S3'));


        const expected = new RegExp('^Root=' + traceId + ';Parent=' + service.id + ';Sampled=0$');
        assert.match(awsRequest.request.headers['X-Amzn-Trace-Id'], expected);
      });
    });
  });
});
