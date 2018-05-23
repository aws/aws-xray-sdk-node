var assert = require('chai').assert;
var expect = require('chai').expect;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var dgram = require('dgram');
var Segment = require('../../lib/segments/segment');

describe('SegmentEmitter', function() {
  var client, sandbox, SegmentEmitter;
  var DEFAULT_DAEMON_ADDRESS = '127.0.0.1';
  var DEFAULT_DAEMON_PORT = 2000;

  function getUncachedEmitter() {
    var path = '../../lib/segment_emitter';
    var path_2 = '../../lib/daemon_config';
    delete require.cache[require.resolve(path)];
    delete require.cache[require.resolve(path_2)];
    return require(path);
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    delete process.env.AWS_XRAY_DAEMON_ADDRESS;
    SegmentEmitter = getUncachedEmitter();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('init', function() {
    it('should load the default address and port', function() {
      assert.equal(SegmentEmitter.getIp(), DEFAULT_DAEMON_ADDRESS);
      assert.equal(SegmentEmitter.getPort(), DEFAULT_DAEMON_PORT);
    });

    it('should load the environment variables address and port if set', function() {
      process.env.AWS_XRAY_DAEMON_ADDRESS = '192.168.0.23:8081';
      SegmentEmitter = getUncachedEmitter();

      assert.equal(SegmentEmitter.getIp(), '192.168.0.23');
      assert.equal(SegmentEmitter.getPort(), 8081);
    });
  });


  describe('#send', function() {
    function testSegmentSend (sendCount, createSocketCount, configureHook, done) {
      client = dgram.createSocket('udp4');
      sandbox.stub(client, 'send').callsFake(function  (msg, offset, length, host, port, callback) {
        setImmediate(callback);

        if (client.send.callCount === sendCount) {
          expect(client.send).to.have.callCount(sendCount);
          expect(client.send).to.have.been.calledWithExactly(sinon.match.any, 0, sinon.match.number,
            SegmentEmitter.getPort(), SegmentEmitter.getIp(), sinon.match.func);

          expect(dgram.createSocket).to.have.callCount(createSocketCount);

          done();
        }
      });
      sandbox.stub(client, 'close');
      sandbox.stub(dgram, 'createSocket').returns(client);

      SegmentEmitter = getUncachedEmitter();
      if (configureHook) {
        configureHook(SegmentEmitter);
      }

      var segment = new Segment('test');
      for (var i = 0;i < sendCount; i++) {
        SegmentEmitter.send(segment);
      }

    }

    it('should send the segment using the dgram client', testSegmentSend.bind(undefined, 1, 1, undefined));

    describe('after disableReusableSocket is called', function() {
      function configureHook (SegmentEmitter) {
        SegmentEmitter.disableReusableSocket();
      }

      it('should send the segment using the dgram client', testSegmentSend.bind(undefined, 1, 2, configureHook));
      it('should share the dgram client between many segments sent at once', testSegmentSend.bind(undefined, 10, 3, configureHook));
    });
  });

  describe('#setDaemonAddress', function() {
    var hostname = 'hostname';
    var ip = '192.168.0.23';
    var port = ':8081';

    it('should set the IP address and port', function() {
      SegmentEmitter.setDaemonAddress(ip + port);

      assert.equal(SegmentEmitter.getIp(), ip);
      assert.equal(SegmentEmitter.getPort(), parseInt(port.slice(1)));
    });

    it('should set the hostname and port', function() {
      SegmentEmitter.setDaemonAddress(hostname + port);

      assert.equal(SegmentEmitter.getIp(), hostname);
      assert.equal(SegmentEmitter.getPort(), parseInt(port.slice(1)));
    });

    it('should not override the environment variables', function() {
      process.env.AWS_XRAY_DAEMON_ADDRESS = '184.88.8.173:4553';
      SegmentEmitter = getUncachedEmitter();

      SegmentEmitter.setDaemonAddress(ip + port);

      assert.equal(SegmentEmitter.getIp(), '184.88.8.173');
      assert.equal(SegmentEmitter.getPort(), 4553);
    });
  });
});
