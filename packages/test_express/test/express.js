var dgram = require('dgram');
var xray = require('aws-xray-sdk-core');
xray.capturePromise();

var createAppWithRoute = require('./helpers').createAppWithRoute;
var createDaemon = require('./helpers').createDaemon;
var jitter = require('./helpers').jitter;
var messageCounter = require('./helpers').messageCounter;
var parseMessage = require('./helpers').parseMessage;
var sleep = require('./helpers').sleep;
var sleepDedupe = require('./helpers').sleepDedupe;
var triggerEndpoint = require('./helpers').triggerEndpoint;
var triggerEndpointWithTimeout = require('./helpers').triggerEndpointWithTimeout;
var validateExpressSegment = require('./helpers').validateExpressSegment;
var ShakyStream = require('./shaky_stream').ShakyStream;

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');
chai.should();

describe('Express', () => {
  /**
   * @type {dgram.Socket}
   */
  var daemon, sandbox;

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
    daemon = createDaemon(done);
    sandbox = sinon.createSandbox();
  });

  afterEach((done) => {
    // disable dynamic naming in case it was enabled by a test
    xray.middleware.dynamicNaming = false;
    xray.middleware.hostPattern = null;

    daemon.close(done);
    sandbox.restore();
  });

  it('should generate fix-named segments', (done) => {
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
        res.status(200).end();
      }
    });

    var server = expressApp.listen(0, () => {
      var url = 'http://127.0.0.1:' + server.address().port + route;

      // wait for the express response, and the daemon to receive messages
      Promise.all([triggerEndpoint(url), daemonMessagesResolved])
      .then((data) => {
        var result = data[0];
        var messages = data[1];

        assert.equal(result.status, 200);
        assert.equal(messages.length, 1);
        
        // verify the Segment is valid
        var segment = parseMessage(messages[0]);
        validateExpressSegment(segment, {
          name: name,
          responseStatus: result.status,
          url: url
        });
        done();
      }).catch(done);
    });
  });

  it('should generate dynamic-named segments', (done) => {
    // resolve promise once expected number of messages received by daemon
    var daemonMessagesResolved = new Promise((resolve) => {
      daemon.on('message', messageCounter(1, resolve));
    });

    var route = '/';
    var name = 'test';
    var dynamicPattern = '*';
    var dynamicName;

    var expressApp = createAppWithRoute({
      dynamicPattern: dynamicPattern,
      name: name,
      route: route,
      handler: function(req, res) {
        dynamicName = req.headers.host;
        res.status(200).end();
      }
    });

    var server = expressApp.listen(0, () => {
      var url = 'http://127.0.0.1:' + server.address().port + route;

      // wait for the express response, and the daemon to receive messages
      Promise.all([triggerEndpoint(url), daemonMessagesResolved])
      .then((data) => {
        var result = data[0];
        var messages = data[1];

        assert.equal(result.status, 200);
        assert.equal(messages.length, 1);
        assert.isString(dynamicName);
        assert.isAtLeast(dynamicName.length, 1);
        
        // verify the Segment is valid
        var segment = parseMessage(messages[0]);
        validateExpressSegment(segment, {
          name: dynamicName,
          responseStatus: result.status,
          url: url
        });

        done();
      }).catch(done);
    });
  });

  it('should close segments with server faults properly', (done) => {
    sandbox.spy(xray.Segment.prototype, 'close');
    const daemonMessagesResolved = new Promise((resolve) => {
      daemon.on('message', messageCounter(1, (resolve)));
    });

    const route = '/';
    const name = 'test';

    // Create express app that has a fault
    const expressApp = createAppWithRoute({
      name: name,
      route: route,
      handler: function(req, res) {
        throw new Error('My test error');
      }
    });

    const server = expressApp.listen(0, () => {
      const url = 'http://127.0.0.1:' + server.address().port + route;

      // wait for the express response, and the daemon to receive messages
      Promise.all([triggerEndpoint(url), daemonMessagesResolved])
      .then((data) => {
        const result = data[0];
        const messages = data[1];

        assert.equal(result.status, 500);
        assert.equal(messages.length, 1);
        
        // verify the Segment has status code & exception populated, and that close is called once
        const segment = parseMessage(messages[0]);
        validateExpressSegment(segment, {
          name: name,
          responseStatus: result.status,
          url: url
        });
        assert.property(segment, 'cause');
        assert.property(segment.cause, 'exceptions');
        assert(xray.Segment.prototype.close.calledOnce);
        done();
      }).catch(() => {
        assert.fail();
        done();
      });
    });
  });

  describe('automatic mode', () => {
    before(() => {
      xray.enableAutomaticMode();
    });

    it('supports segment retrieval', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = xray.getSegment();
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);

          done();
        }).catch(done);
      });
    });

    it('supports segment annotations', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = xray.getSegment();
          expressSegment.addAnnotation('foo', 'bar');
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);
          assert.deepEqual(segment.annotations, {foo: 'bar'});
          done();
        }).catch(done);
      });
    });

    it('supports segment metadata', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = xray.getSegment();
          expressSegment.addMetadata('foo', 'bar');
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);
          assert.deepEqual(segment.metadata, {default: {foo: 'bar'}});
          done();
        }).catch(done);
      });
    });

    it('supports captureFunc', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var subsegmentName = 'descendant';

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          xray.captureFunc(subsegmentName, () => {/* just generate a subsegment */});
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          assert.equal(segment.subsegments.length, 1);
          assert.equal(segment.subsegments[0].name, subsegmentName);
          done();
        }).catch(done);
      });
    });

    it('supports captureAsyncFunc', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var subsegmentName = 'descendant';

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          xray.captureAsyncFunc(subsegmentName, (subsegment) => {
            setTimeout(() => {
              subsegment.close();
              res.status(200).end();
            }, 0);
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
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          assert.equal(segment.subsegments.length, 1);
          assert.equal(segment.subsegments[0].name, subsegmentName);
          done();
        }).catch(done);
      });
    });

    it('supports client-side cancelled requests after response headers sent', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = xray.getSegment();
          var slowStream = new ShakyStream({
            pauseFor: 4000
          });
          res.status(200);
          slowStream.pipe(res);
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpointWithTimeout(url, 100), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);

          done();
        }).catch(done);
      });
    });

    it('supports client-side cancelled requests before response headers sent', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = xray.getSegment();
          setTimeout(() => {
            res.status(500).end();
          }, 400);
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpointWithTimeout(url, 100), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, void 0);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            // all ServerResponse instances have a default statusCode of 200
            // https://github.com/nodejs/node/blob/56098a9c3f227df29ece95d773186194f2a1ec64/lib/_http_server.js#L159
            responseStatus: 200,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);

          done();
        }).catch(done);
      });
    });

    describe('with parallel requests', () => {
      it('sets subsegment on correct segment', (done) => {
        // resolve promise once expected number of messages received by daemon
        var daemonMessagesResolved = new Promise((resolve) => {
          daemon.on('message', messageCounter(5, resolve));
        });
    
        var route = '/';
        var name = 'test';
        var subsegmentName = 'descendant';

        var counter = 0;

        var expressApp = createAppWithRoute({
          name: name,
          route: route,
          handler: function(req, res) {
            var segment = xray.getSegment();
            var count = ++counter;
            segment.addAnnotation('segmentCount', count);
            sleep(jitter()).then(() => {
              // create matching subsegment
              xray.captureAsyncFunc(subsegmentName, (subsegment) => {
                setTimeout(() => {
                  subsegment.addAnnotation('subsegmentCount', count);
                  subsegment.close();
                  res.status(200).end();
                }, jitter());
              });
            }).catch((err) => {
              res.status(500).end();
            });
          }
        });
    
        var server = expressApp.listen(0, () => {
          var url = 'http://127.0.0.1:' + server.address().port + route;
    
          // wait for the express response, and the daemon to receive messages
          var actions = [daemonMessagesResolved];
          // trigger 5 calls to express
          for (var i = 0; i < 5; i++) {
            actions.push(triggerEndpoint(url, jitter()));
          }
          Promise.all(actions)
          .then((data) => {
            var messages = data[0];
            var results = data.slice(1);
    
            assert.equal(messages.length, 5);
            results.forEach((r) => {
              assert.equal(r.status, 200);
            });

            // verify the Segments are valid
            messages.forEach((message) => {
              var segment = parseMessage(message);
              validateExpressSegment(segment, {
                name: name,
                responseStatus: 200,
                url: url
              });

              assert.equal(segment.subsegments.length, 1);
              assert.equal(segment.subsegments[0].name, subsegmentName);
              assert.equal(segment.annotations.segmentCount, segment.subsegments[0].annotations.subsegmentCount);
            });
            done();
          }).catch(done);
        });
      });

      it('sets subsegment on correct segment (with dedupe)', (done) => {
        // this test should fail if xray.capturePromise() is not called (unless using cls-hooked)

        // resolve promise once expected number of messages received by daemon
        var daemonMessagesResolved = new Promise((resolve) => {
          daemon.on('message', messageCounter(5, resolve));
        });
    
        var route = '/';
        var name = 'test';
        var subsegmentName = 'descendant';

        var counter = 0;

        var sleeper = sleepDedupe();

        var expressApp = createAppWithRoute({
          name: name,
          route: route,
          handler: function(req, res) {
            var segment = xray.getSegment();
            var count = ++counter;
            segment.addAnnotation('segmentCount', count);
            // simulate making a de-duped network request
            sleeper().then(() => {
              // create matching subsegment
              xray.captureAsyncFunc(subsegmentName, (subsegment) => {
                setTimeout(() => {
                  subsegment.addAnnotation('subsegmentCount', count);
                  subsegment.close();
                  res.status(200).end();
                });
              });
            }).catch((err) => {
              res.status(500).end();
            });
          }
        });
    
        var server = expressApp.listen(0, () => {
          var url = 'http://127.0.0.1:' + server.address().port + route;
    
          // wait for the express response, and the daemon to receive messages
          var actions = [daemonMessagesResolved];
          // trigger 5 calls to express
          for (var i = 0; i < 5; i++) {
            actions.push(triggerEndpoint(url));
          }
          Promise.all(actions)
          .then((data) => {
            var messages = data[0];
            var results = data.slice(1);
    
            assert.equal(messages.length, 5);
            results.forEach((r) => {
              assert.equal(r.status, 200);
            });

            // verify the Segments are valid
            messages.forEach((message) => {
              var segment = parseMessage(message);
              validateExpressSegment(segment, {
                name: name,
                responseStatus: 200,
                url: url
              });
              assert.equal(segment.subsegments.length, 1);
              assert.equal(segment.subsegments[0].name, subsegmentName);
              assert.equal(segment.annotations.segmentCount, segment.subsegments[0].annotations.subsegmentCount);
            });
            done();
          }).catch(done);
        });
      });
    });
  });

  describe('manual mode', () => {
    before(() => {
      xray.enableManualMode();
    });

    it('supports segment retrieval', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = req.segment;
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);

          done();
        }).catch(done);
      });
    });

    it('supports segment annotations', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = req.segment;
          expressSegment.addAnnotation('foo', 'bar');
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);
          assert.deepEqual(segment.annotations, {foo: 'bar'});
          done();
        }).catch(done);
      });
    });

    it('supports segment metadata', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var expressSegment;

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          expressSegment = req.segment;
          expressSegment.addMetadata('foo', 'bar');
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          // verify segment retrieved from express handler
          assert.isDefined(expressSegment);
          assert.equal(expressSegment.id, segment.id);
          assert.deepEqual(segment.metadata, {default: {foo: 'bar'}});
          done();
        }).catch(done);
      });
    });

    it('supports captureFunc', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var subsegmentName = 'descendant';

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          xray.captureFunc(subsegmentName, () => {/* just generate a subsegment */}, req.segment);
          res.status(200).end();
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          assert.equal(segment.subsegments.length, 1);
          assert.equal(segment.subsegments[0].name, subsegmentName);
          done();
        }).catch(done);
      });
    });

    it('supports captureAsyncFunc', (done) => {
      // resolve promise once expected number of messages received by daemon
      var daemonMessagesResolved = new Promise((resolve) => {
        daemon.on('message', messageCounter(1, resolve));
      });
  
      var route = '/';
      var name = 'test';
      var subsegmentName = 'descendant';

      var expressApp = createAppWithRoute({
        name: name,
        route: route,
        handler: function(req, res) {
          xray.captureAsyncFunc(subsegmentName, (subsegment) => {
            setTimeout(() => {
              subsegment.close();
              res.status(200).end();
            }, 0);
          }, req.segment);
        }
      });
  
      var server = expressApp.listen(0, () => {
        var url = 'http://127.0.0.1:' + server.address().port + route;
  
        // wait for the express response, and the daemon to receive messages
        Promise.all([triggerEndpoint(url), daemonMessagesResolved])
        .then((data) => {
          var result = data[0];
          var messages = data[1];
  
          assert.equal(result.status, 200);
          assert.equal(messages.length, 1);
          
          // verify the Segment is valid
          var segment = parseMessage(messages[0]);
          validateExpressSegment(segment, {
            name: name,
            responseStatus: result.status,
            url: url
          });
  
          assert.equal(segment.subsegments.length, 1);
          assert.equal(segment.subsegments[0].name, subsegmentName);
          done();
        }).catch(done);
      });
    });
  });
});