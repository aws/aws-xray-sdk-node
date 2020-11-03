var dgram = require('dgram');
var xray = require('aws-xray-sdk-core');
xray.capturePromise();

var S3 = require('aws-sdk/clients/s3');
var Polly = require('aws-sdk/clients/polly');

var createAppWithRoute = require('./helpers').createAppWithRoute;
var createDaemon = require('./helpers').createDaemon;
var createS3Service = require('./helpers').createS3Service;
var messageCounter = require('./helpers').messageCounter;
var parseMessage = require('./helpers').parseMessage;
var triggerEndpoint = require('./helpers').triggerEndpoint;
var validateExpressSegment = require('./helpers').validateExpressSegment;

var chai = require('chai');
var assert = chai.assert;
chai.should();

describe('Aws', () => {
  /**
   * @type {dgram.Socket}
   */
  var daemon;

  before(() => {
    // force all requests to be sampled
    xray.middleware.disableCentralizedSampling();
    xray.middleware.setSamplingRules({
      "version": 2,
      "rules": [],
      "default": {
        "fixed_target": 0,
        "rate": 1
      }
    });
  });

  beforeEach((done) => {
    // start test daemon
    daemon = createDaemon(done);
  });

  afterEach((done) => {
    // disable dynamic naming in case it was enabled by a test
    xray.middleware.dynamicNaming = false;
    xray.middleware.hostPattern = null;

    daemon.close(done);
  });

  describe('client patching', () => {
    /**
     * @type {S3}
     */
    var s3;
    /**
     * @type {ReturnType<createS3Service>}
     */
    var s3Server;

    beforeEach((done) => {
      // start fake s3 service
      s3Server = createS3Service();
      s3Server.listen(0, () => {
        // instantiate S3 client
        s3 = new S3({
          credentials: {
            accessKeyId: 'akid',
            secretAccessKey: 'secret'
          },
          region: 'foo-bar-1',
          endpoint: `http://127.0.0.1:${s3Server.address().port}`
        });

        // patch the s3 client used in the folllowing tests
        xray.captureAWSClient(s3);

        done();
      });
    });

    afterEach((done) => {
      s3Server.close(done);
    });

    it('should generate subsegments for operations', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, (resolve)));
      });

      var route = '/';
      var name = 'test';
      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          s3.headBucket({Bucket: 'BUCKET'}, (err, data) => {
            res.status(204).end();
          });
        }
      });

      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 204);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });

          assert.lengthOf(segment.subsegments, 1);
          var subsegment = segment.subsegments[0];
          assert.deepEqual(subsegment.aws, {
            bucket_name: 'BUCKET',
            id_2: 'id2',
            operation: 'HeadBucket',
            region: 'foo-bar-1',
            request_id: 'requestId',
            retries: 0
          });

          assert.equal(subsegment.namespace, 'aws');
          assert.equal(subsegment.name, 's3');

          assert.deepEqual(subsegment.http, {
            response: {
              status: 200
            }
          });

          done();
        }).catch(done);
        
      });
    });

    it('should not generate subsegments for getSignedUrl', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, (resolve)));
      });

      var route = '/';
      var name = 'test';
      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          s3.getSignedUrl('getObject', {Bucket: 'BUCKET', Key: 'KEY'}, (err, url) => {
            res.status(204).end();
          });
        }
      });

      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 204);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });

          assert.isUndefined(segment.subsegments);

          done();
        }).catch(done);
      });
    });

    it('should not generate subsegments for getSignedUrl (nested)', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, (resolve)));
      });

      var route = '/';
      var name = 'test';
      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          xray.captureAsyncFunc('timing', (subsegment) => {
            s3.getSignedUrl('getObject', {Bucket: 'BUCKET', Key: 'KEY'}, (err, url) => {
              subsegment.close();
              res.status(204).end();
            });
          });
          
        }
      });

      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 204);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });

          assert.lengthOf(segment.subsegments, 1);

          var subsegment = segment.subsegments[0];
          assert.isNumber(subsegment.end_time);
          assert.isNumber(subsegment.start_time);
          assert.equal(subsegment.name, 'timing');

          done();
        }).catch(done);
      });
    });

    it('should not generate subsegments for presigned urls', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, (resolve)));
      });

      var presigner = new Polly.Presigner({
        service: new Polly({
          credentials: {
            accessKeyId: 'akid',
            secretAccessKey: 'secret'
          },
          region: 'foo-bar-1'
        })
      });
      xray.captureAWSClient(presigner.service);

      var route = '/';
      var name = 'test';
      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          presigner.getSynthesizeSpeechUrl({
            OutputFormat: 'pcm',
            Text: 'testing...1 2 3',
            VoiceId: 'Ivy' 
          }, (err, url) => {
            res.status(204).end();
          });
        }
      });

      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 204);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });

          assert.isUndefined(segment.subsegments);

          done();
        }).catch(done);
      });
    });
  });
});