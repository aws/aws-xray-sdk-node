var assert = require('chai').assert;

var logger = require('../../lib/logger');

describe('logger', function () {
  function reloadLogger() {
    var path = '../../lib/logger';
    delete require.cache[require.resolve(path)];
    logger = require(path);
  }

  describe('defaults', function () {
    afterEach(function () {
      delete process.env.AWS_XRAY_DEBUG_MODE;
      reloadLogger();

    });
    it('Should have a default logger with no transport and level set to info', function () {
      process.env.AWS_XRAY_LOG_LEVEL = '';
      process.env.AWS_XRAY_DEBUG_MODE = '';
      reloadLogger();
      assert.deepEqual(logger.getLogger().transports, {});
      assert.equal(logger.getLogger().level, 'info');
    });
    it('Should have a logger with console transport with level set to debug when AWS_XRAY_DEBUG_MODE is set', function () {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      reloadLogger();
      assert.equal(logger.getLogger().transports.console.level, 'debug');
    });
    it('Should have a logger with console transport with level set to debug when AWS_XRAY_DEBUG_MODE is set even when XRAY_LOG_LEVEL is error', function () {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      process.env.AWS_XRAY_LOG_LEVEL = 'error';
      reloadLogger();
      assert.equal(logger.getLogger().transports.console.level, 'debug');
    });
    it('Should have a logger with console transport with level set to error when AWS_XRAY_LOG_LEVEL=error and AWS_XRAY_DEBUG_MODE is not set', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'error';
      process.env.AWS_XRAY_DEBUG_MODE = '';
      reloadLogger();
      assert.equal(logger.getLogger().transports.console.level, 'error');
    });
  });
});
