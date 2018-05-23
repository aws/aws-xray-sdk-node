var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
const util = require('util');

describe('DaemonConfig', function() {
  var sandbox, DaemonConfig;
  var DEFAULT_DAEMON_ADDRESS = '127.0.0.1';
  var DEFAULT_DAEMON_PORT = 2000;

  function getUncachedConfig() {
    var path = '../../lib/daemon_config';
    delete require.cache[require.resolve(path)];
    return require(path);
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    delete process.env.AWS_XRAY_DAEMON_ADDRESS;
    DaemonConfig = getUncachedConfig();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('init', function() {
    it('should load the default address and port', function() {
      assert.equal(DaemonConfig.tcp_ip, DEFAULT_DAEMON_ADDRESS);
      assert.equal(DaemonConfig.udp_ip, DEFAULT_DAEMON_ADDRESS);
      assert.equal(DaemonConfig.tcp_port, DEFAULT_DAEMON_PORT);
      assert.equal(DaemonConfig.udp_port, DEFAULT_DAEMON_PORT);
    });

    it('should load the environment variables address and port if set', function() {
      process.env.AWS_XRAY_DAEMON_ADDRESS = '192.168.0.23:8081';
      DaemonConfig = getUncachedConfig();

      assert.equal(DaemonConfig.tcp_ip, '192.168.0.23');
      assert.equal(DaemonConfig.udp_ip, '192.168.0.23');
      assert.equal(DaemonConfig.tcp_port, 8081);
      assert.equal(DaemonConfig.udp_port, 8081);
    });
  });

  describe('#setValidDaemonAddress', function() {
    var tcp_ip = '192.168.0.23';
    var tcp_port = '8080';
    var udp_ip = '192.168.0.24';
    var udp_port = '3000';

    it('should set the IP address and port for both tcp and udp', function() {
      DaemonConfig.setDaemonAddress(tcp_ip + ':' + tcp_port);

      assert.equal(DaemonConfig.tcp_ip, tcp_ip);
      assert.equal(DaemonConfig.udp_ip, tcp_ip);
      assert.equal(DaemonConfig.tcp_port, parseInt(tcp_port));
      assert.equal(DaemonConfig.udp_port, parseInt(tcp_port));
    });

    it('should set the tcp and udp addresses separately', function() {
      var input = util.format('tcp:%s:%s udp:%s:%s', tcp_ip, tcp_port, udp_ip, udp_port)
      DaemonConfig.setDaemonAddress(input);

      assert.equal(DaemonConfig.tcp_ip, tcp_ip);
      assert.equal(DaemonConfig.udp_ip, udp_ip);
      assert.equal(DaemonConfig.tcp_port, parseInt(tcp_port));
      assert.equal(DaemonConfig.udp_port, parseInt(udp_port));

      var input_reverse = util.format('udp:%s:%s tcp:%s:%s', udp_ip, udp_port, tcp_ip, tcp_port)
      DaemonConfig.setDaemonAddress(input);

      assert.equal(DaemonConfig.tcp_ip, tcp_ip);
      assert.equal(DaemonConfig.udp_ip, udp_ip);
      assert.equal(DaemonConfig.tcp_port, parseInt(tcp_port));
      assert.equal(DaemonConfig.udp_port, parseInt(udp_port));
    });

    it('should not override the environment variables', function() {
      process.env.AWS_XRAY_DAEMON_ADDRESS = '184.88.8.173:4553';
      DaemonConfig = getUncachedConfig();

      DaemonConfig.setDaemonAddress(tcp_ip + ':' + tcp_port);

      assert.equal(DaemonConfig.tcp_ip, '184.88.8.173');
      assert.equal(DaemonConfig.tcp_port, 4553);
    });
  });

  describe('#setInvalidDaemonAddress', function() {
    it('should throw an exception if address is partial', function() {
      expect(function() { DaemonConfig.setDaemonAddress('127.0.0.100'); }).to.throw(Error);
      expect(function() { DaemonConfig.setDaemonAddress(':8000'); }).to.throw(Error);
      expect(function() { DaemonConfig.setDaemonAddress('8000'); }).to.throw(Error);
    });

    it('should throw an exception if only one of tcp and udp address is provided', function() {
      expect(function() { DaemonConfig.setDaemonAddress('tcp:127.0.0.100:3000'); }).to.throw(Error);
      expect(function() { DaemonConfig.setDaemonAddress('udp:127.0.0.1:8000'); }).to.throw(Error);
    });

    it('should throw an exception if tcp or udp prefix is missing', function() {
      expect(function() { DaemonConfig.setDaemonAddress('tcp:127.0.0.100:3000 127.0.0.1:8000'); }).to.throw(Error);
      expect(function() { DaemonConfig.setDaemonAddress('udp:127.0.0.1:8000 127.0.0.100:3000'); }).to.throw(Error);
    });
  });
});