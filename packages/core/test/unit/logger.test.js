var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var logger = require('../../lib/logger');

describe('logger', function () {
  function reloadLogger() {
    var path = '../../lib/logger';
    delete require.cache[require.resolve(path)];
    logger = require(path);
  }

  describe('setting logging levels', function () {
    afterEach(function () {
      delete process.env.AWS_XRAY_DEBUG_MODE;
      delete process.env.AWS_XRAY_LOG_LEVEL;
      reloadLogger();

    });

    it('Should have a default logger with level set to error', function () {
      process.env.AWS_XRAY_LOG_LEVEL = '';
      process.env.AWS_XRAY_DEBUG_MODE = '';
      reloadLogger();
      assert.equal(logger.getLogger().getLevel(), 'error');
    });

    it('Should have a logger with level set to debug when AWS_XRAY_DEBUG_MODE is set', function () {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      reloadLogger();
      assert.equal(logger.getLogger().getLevel(), 'debug');
    });

    it('Should have a loggerwith level set to debug when AWS_XRAY_DEBUG_MODE is set even when XRAY_LOG_LEVEL is error', function () {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      process.env.AWS_XRAY_LOG_LEVEL = 'error';
      reloadLogger();
      assert.equal(logger.getLogger().getLevel(), 'debug');
    });

    it('Should have a logger with level set to warn when AWS_XRAY_LOG_LEVEL=warn and AWS_XRAY_DEBUG_MODE is not set', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      assert.equal(logger.getLogger().getLevel(), 'warn');
    });

    it('Should set level to error if invalid level specified in AWS_XRAY_LOG_LEVEL', function() {
      process.env.AWS_XRAY_LOG_LEVEL = 'somethingnotquiteright';
      reloadLogger();
      assert.equal(logger.getLogger().getLevel(), 'error');
    })

    it('Should set logging level after initialisation', function() {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      
      assert.equal(logger.getLogger().getLevel(), 'warn');
      logger.getLogger().setLevel('debug')
      assert.equal(logger.getLogger().getLevel(), 'debug');
    })

    it('Should set logging level to error if invalid value is used after initialisation', function() {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      
      assert.equal(logger.getLogger().getLevel(), 'warn');
      logger.getLogger().setLevel('debugorsomething')
      assert.equal(logger.getLogger().getLevel(), 'error');
    })
  });

  describe('console logging levels', function () {
    beforeEach(function() {
      sinon.spy(console, "error");
      sinon.spy(console, "warn");
      sinon.spy(console, "info");
      sinon.spy(console, "debug");
      logger.getLogger().setLevel('debug');
    })

    afterEach(function () {
      console.error.restore();
      console.warn.restore();
      console.info.restore();
      console.debug.restore();
    });

    it('Should have a default logger with level set to error', function () {
      logger.getLogger().debug('test');
      expect(console.debug).to.be.calledOnce;
    });

    it('Should have a default logger with level set to error', function () {
      logger.getLogger().info('test');
      expect(console.info).to.be.calledOnce;
    });

    it('Should have a default logger with level set to error', function () {
      logger.getLogger().warn('test');
      expect(console.warn).to.be.calledOnce;
    });

    it('Should have a default logger with level set to error', function () {
      logger.getLogger().error('test');
      expect(console.error).to.be.calledOnce;
    });
  });
});
