var dgram = require('dgram');
var xray = require('aws-xray-sdk-core');
xray.capturePromise();
var jmespath = require('jmespath');

var createAppWithRoute = require('./helpers').createAppWithRoute;
var createDaemon = require('./helpers').createDaemon;
var messageCounter = require('./helpers').messageCounter;
var parseMessage = require('./helpers').parseMessage;
var triggerEndpoint = require('./helpers').triggerEndpoint;

var chai = require('chai');
var assert = chai.assert;
chai.should();

describe('Express', () => {
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
    daemon = createDaemon();
    daemon.bind(() => {
      var address = daemon.address().address + ':' + daemon.address().port;
      xray.setDaemonAddress(address);
      done()
    });
  });

  afterEach((done) => {
    daemon.close(done);
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
        assert.equal(jmespath.search(segment, 'name'), name);
        assert.equal(jmespath.search(segment, 'http.request.method'), 'GET');
        assert.equal(jmespath.search(segment, 'http.response.status'), result.status);
        assert.equal(jmespath.search(segment, 'type(trace_id)'), 'string');
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
        assert.equal(jmespath.search(segment, 'name'), dynamicName);
        assert.equal(jmespath.search(segment, 'http.request.method'), 'GET');
        assert.equal(jmespath.search(segment, 'http.response.status'), result.status);
        assert.equal(jmespath.search(segment, 'type(trace_id)'), 'string');

        done();
      }).catch(done);
    });
  });
});