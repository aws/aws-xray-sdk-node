var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var logging = require('../../lib/logger');

describe('logger', function () {
  function reloadLogger() {
    var path = '../../lib/logger';
    delete require.cache[require.resolve(path)];
    logging = require(path);
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
      assert.equal(logging.getLogger().getLevel(), 'error');
    });

    it('Should have a logger with level set to debug when AWS_XRAY_DEBUG_MODE is set', function () {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      reloadLogger();
      assert.equal(logging.getLogger().getLevel(), 'debug');
    });

    it('Should have a loggerwith level set to debug when AWS_XRAY_DEBUG_MODE is set even when XRAY_LOG_LEVEL is error', function () {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      process.env.AWS_XRAY_LOG_LEVEL = 'error';
      reloadLogger();
      assert.equal(logging.getLogger().getLevel(), 'debug');
    });

    it('Should have a logger with level set to warn when AWS_XRAY_LOG_LEVEL=warn and AWS_XRAY_DEBUG_MODE is not set', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      assert.equal(logging.getLogger().getLevel(), 'warn');
    });

    it('Should set level to error if invalid level specified in AWS_XRAY_LOG_LEVEL', function() {
      process.env.AWS_XRAY_LOG_LEVEL = 'somethingnotquiteright';
      reloadLogger();
      assert.equal(logging.getLogger().getLevel(), 'error');
    });

    it('Should set logging level after initialisation', function() {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      
      assert.equal(logging.getLogger().getLevel(), 'warn');
      logging.getLogger().setLevel('debug');
      assert.equal(logging.getLogger().getLevel(), 'debug');
    });

    it('Should set logging level to error if invalid value is used after initialisation', function() {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      
      assert.equal(logging.getLogger().getLevel(), 'warn');
      logging.getLogger().setLevel('debugorsomething');
      assert.equal(logging.getLogger().getLevel(), 'error');
    });
  });

  /* eslint-disable no-console */
  describe('console logging methods', function () {
    var spies = [];

    beforeEach(function() {
      spies.push(sinon.spy(console, 'error'));
      spies.push(sinon.spy(console, 'warn'));
      spies.push(sinon.spy(console, 'info'));
      spies.push(sinon.spy(console, 'log'));

      if (console.debug) {
        spies.push(sinon.spy(console, 'debug'));
      }

      reloadLogger();
      logging.getLogger().setLevel('debug');
    });

    afterEach(function () {
      spies.forEach(spy => spy.restore());
      spies = [];
    });

    it('Should send debug logs to console.debug', function () {
      logging.getLogger().debug('test');
      
      if (console.debug) {
        expect(console.debug).to.be.calledOnce;
      } else {
        expect(console.log).to.be.calledOnce;
      }
    });

    it('Should send info logs to console.info', function () {
      logging.getLogger().info('test');
      expect(console.info).to.be.calledOnce;
    });

    it('Should send warn logs to console.warn', function () {
      logging.getLogger().warn('test');
      expect(console.warn).to.be.calledOnce;
    });

    it('Should sent error logs to console.error', function () {
      logging.getLogger().error('test');
      expect(console.error).to.be.calledOnce;
    });
  });

  describe('console logging filters', function () {
    var spies = [];

    beforeEach(function() {
      spies.push(sinon.spy(console, 'error'));
      spies.push(sinon.spy(console, 'warn'));
      spies.push(sinon.spy(console, 'info'));
      spies.push(sinon.spy(console, 'log'));

      if (console.debug) {
        spies.push(sinon.spy(console, 'debug'));
      }

      reloadLogger();
    });

    afterEach(function () {
      spies.forEach(spy => spy.restore());
      spies = [];
    });

    it('Should not emit log if log level is silent', function () {
      var logger = logging.getLogger();
      logger.setLevel('silent');
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      spies.forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should only emit error logs if level is error', function () {
      var logger = logging.getLogger();
      logger.setLevel('error');
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      expect(console.error).to.be.calledOnce;
      spies.filter(spy => spy !== console.error)
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should emit error and warn logs if level is warn', function () {
      var logger = logging.getLogger();
      logger.setLevel('warn');
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      var expected = [ console.error, console.warn ];
      expected.forEach(spy => expect(spy).to.be.called);
      spies.filter(spy => !expected.includes(spy))
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should emit error, warn, and info logs if level is info', function () {
      var logger = logging.getLogger();
      logger.setLevel('info');
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      var expected = [ console.error, console.warn, console.info ];
      expected.forEach(spy => expect(spy).to.be.called);
      spies.filter(spy => !expected.includes(spy))
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should emit all logs if level is debug', function () {
      var logger = logging.getLogger();
      logger.setLevel('debug');
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      var filterMethod = console.debug ? (spy => spy !== console.log) : (() => true);
      spies.filter(filterMethod).forEach(spy => expect(spy).to.be.called);
    });
  });
  /* eslint-enable no-console */
});
