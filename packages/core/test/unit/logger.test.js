var expect = require('chai').expect;
var sinon = require('sinon');
var logging = require('../../lib/logger');

describe('logger', function () {
  var spies = [];

  function reloadLogger() {
    var path = '../../lib/logger';
    delete require.cache[require.resolve(path)];
    logging = require(path);
  }

  before(function() {
    spies.push(sinon.spy(console, 'error'));
    spies.push(sinon.spy(console, 'warn'));
    spies.push(sinon.spy(console, 'info'));
    spies.push(sinon.spy(console, 'log'));

    if (console.debug) {
      spies.push(sinon.spy(console, 'debug'));
    }
  });

  afterEach(function () {
    spies.forEach(spy => spy.resetHistory());
  });

  after(function () {
    spies.forEach(spy => spy.restore());
  });

  describe('console logging methods', function () {
    before(function() {
      process.env.AWS_XRAY_DEBUG_MODE = 'set';
      reloadLogger();
    });

    after(function() {
      delete process.env.AWS_XRAY_DEBUG_MODE;
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
    function sendLogMessages() {
      var logger = logging.getLogger();
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');
    }

    afterEach(function() {
      delete process.env.AWS_XRAY_LOG_LEVEL;
    });

    it('Should not emit log if log level is silent', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'silent';
      reloadLogger();

      sendLogMessages();
      spies.forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should only emit error logs if level is error', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'error';
      reloadLogger();
      
      sendLogMessages();
      expect(console.error).to.be.calledOnce;
      spies.filter(spy => spy !== console.error)
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should emit error and warn logs if level is warn', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();
      
      sendLogMessages();
      var expected = [ console.error, console.warn ];
      expected.forEach(spy => expect(spy).to.be.called);
      spies.filter(spy => !expected.includes(spy))
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should emit error, warn, and info logs if level is info', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'info';
      reloadLogger();
      
      sendLogMessages();
      var expected = [ console.error, console.warn, console.info ];
      expected.forEach(spy => expect(spy).to.be.called);
      spies.filter(spy => !expected.includes(spy))
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should emit all logs if level is debug', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'debug';
      reloadLogger();
      
      sendLogMessages();
      var filterMethod = console.debug ? (spy => spy !== console.log) : (() => true);
      spies.filter(filterMethod).forEach(spy => expect(spy).to.be.called);
    });

    it('Should default to error if invalid log level', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'not_a_level';
      reloadLogger();
      
      sendLogMessages();
      expect(console.error).to.be.calledOnce;
      spies.filter(spy => spy !== console.error)
        .forEach(spy => expect(spy).to.not.be.called);
    });

    it('Should default to error if no log level', function () {
      reloadLogger();
      
      sendLogMessages();
      expect(console.error).to.be.calledOnce;
      spies.filter(spy => spy !== console.error)
        .forEach(spy => expect(spy).to.not.be.called);
    });
  });
});
