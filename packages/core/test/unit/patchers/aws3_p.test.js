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
    var customStub, sandbox, addMiddleware;

    var awsClient = {
      send: function() {},
      config: {
        serviceId: 's3',
      },
      middlewareStack: constructStack(),
    };

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      customStub = sandbox.stub(awsClient, 'send');
      addMiddleware = sandbox.stub(awsClient.middlewareStack, 'add');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call middlewareStack.add and return the service', function() {
      var patched = awsPatcher.captureAWSClient(awsClient);
      addMiddleware.should.have.been.calledOnce;
      assert.equal(patched, awsClient);
    });
  });

  describe('#captureAWSRequest', function() {
    var awsClient, awsRequest, sandbox, segment, stubResolve, stubResolveManual, addNewSubsegmentStub, sub;

    before(function() {
      awsClient = {
        send: async (req) => {
          const handler = awsClient.middlewareStack.resolve((args) => args);
          await handler(req);
          const error = req.response.error;
          if (error) {
            const err = new Error(error.message);
            err.name = error.code;
            err.$metadata = req.response.$metadata;
            throw err;
          }
          return req.response;
        },
        config: {
          serviceId: 's3',
          region: async () => 'us-east-1',
        },
        middlewareStack: constructStack(),
      };
      awsClient = awsPatcher.captureAWSClient(awsClient);
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
          this.response = {
            $metadata: {}
          };
        }
      })();

      segment = new Segment('testSegment', traceId);
      sub = segment.addNewSubsegment('subseg');

      stubResolveManual = sandbox.stub(contextUtils, 'resolveManualSegmentParams');
      stubResolve = sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      addNewSubsegmentStub = sandbox.stub(segment, 'addNewSubsegment').returns(sub);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it.skip('should call to resolve any manual params', function() {
      awsClient.send(awsRequest);

      stubResolveManual.should.have.been.calledWith(awsRequest.params);
    });

    it('should log an info statement and exit if parent is not found on the context or on the call params', function(done) {
      stubResolve.returns();
      var logStub = sandbox.stub(logger, 'info');

      awsClient.send(awsRequest);

      setTimeout(function() {
        logStub.should.have.been.calledOnce;
        done();
      }, 50);
    });

    it('should inject the tracing headers', async function() {
      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);

      awsClient.middlewareStack.add((next) => (args) => {
        stubResolve.returns(sub);
        next(args);
        stubResolve.returns(segment);
      }, { step: 'build', priority: 'high' });

      await awsClient.send(awsRequest);

      assert.isTrue(addNewSubsegmentStub.calledWith('s3'));

      var expected = new RegExp('^Root=' + traceId + ';Parent=' + sub.id + ';Sampled=1$');
      assert.match(awsRequest.request.headers['X-Amzn-Trace-Id'], expected);
    });

    it('should close on complete with no errors when code 200 is seen', async function() {
      var closeStub = sandbox.stub(sub, 'close').returns();
      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      sandbox.stub(sub, 'addAttribute').returns();
      sandbox.stub(Aws.prototype, 'init').returns();

      awsRequest.response = {
        $metadata: { httpStatusCode: 200 },
      };

      await awsClient.send(awsRequest);

      closeStub.should.have.been.calledWithExactly();
    });

    it('should mark the subsegment as throttled and error if code 429 is seen', async function() {
      var throttleStub = sandbox.stub(sub, 'addThrottleFlag').returns();

      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
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
      var throttleStub = sandbox.stub(sub, 'addThrottleFlag').returns();

      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
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
      var closeStub = sandbox.stub(sub, 'close').returns();
      var getCauseStub = sandbox.stub(Utils, 'getCauseTypeFromHttpStatus').returns();

      sandbox.stub(contextUtils, 'isAutomaticMode').returns(true);
      sandbox.stub(sub, 'addAttribute').returns();
      sandbox.stub(Aws.prototype, 'init').returns();

      var error = { message: 'big error', code: 'Error' };

      awsRequest.response = {
        error,
        $metadata: { httpStatusCode: 500 },
      };

      await awsClient.send(awsRequest).catch(() => null);

      getCauseStub.should.have.been.calledWithExactly(500);
      closeStub.should.have.been.calledWithExactly(sinon.match({ message: error.message, name: error.code}), true);
    });
  });
});
