var expect = require('chai').expect;
var rewire = require('rewire');
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

  describe('console logging format', function () {
    var logMessageRegex = /(\d{4}-[01]\d-[0-3]\d) ([0-2]\d:[0-5]\d:[0-5]\d\.\d+) ([+-][0-2]\d:[0-5]\d) \[(\w+)\](.*)/;
    var timestampRegex = /(\d{4}-[01]\d-[0-3]\d) ([0-2]\d:[0-5]\d:[0-5]\d\.\d+) ([+-][0-2]\d:[0-5]\d)/;

    before(function() {
      reloadLogger();
    });

    afterEach(function() {
      delete process.env.LAMBDA_TASK_ROOT;
    });

    it('should output error message', () => {
      var logger = logging.getLogger();
      var expectedMessage = 'error message';
      logger.error(expectedMessage);

      var message = console.error.args[0][0];
      var groups = message.match(logMessageRegex);
      expect(groups[4]).to.equal('ERROR');
      expect(groups[5].trim()).to.equal(expectedMessage);
    });

    it('should not output if message and meta falsey', () => {
      var logger = logging.getLogger();
      logger.error();
      logger.error(null);
      logger.error('', null);

      spies.forEach(spy => expect(spy).not.to.be.called);
    });

    it('should convert falsey value to empty string', () => {
      var logger = logging.getLogger();
      logger.error(null, {});

      var message = console.error.args[0][0];
      var groups = message.match(logMessageRegex);
      expect(groups[4]).to.equal('ERROR');
      expect(groups[5]).to.equal('');
    });

    it('should not add timestamp to lambda errors', () => {
      process.env.LAMBDA_TASK_ROOT = 'on';
      var expectedMessage = 'error message';
      var logger = logging.getLogger();
      logger.error(expectedMessage);

      var message = console.error.args[0][0];
      expect(logMessageRegex.test(message)).to.be.false;
      expect(message).to.equal(expectedMessage);
    });

    it('should only output metadata for lambda with no message', () => {
      process.env.LAMBDA_TASK_ROOT = 'on';
      var expectedMetaData = 'this is some metadata';
      var logger = logging.getLogger();
      logger.error(null, expectedMetaData);

      var message = console.error.args[0][0];
      expect(logMessageRegex.test(message)).to.be.false;
      expect(message).to.equal(expectedMetaData);
    });

    it('should output both message and metadata for lambda', () => {
      process.env.LAMBDA_TASK_ROOT = 'on';
      var expectedMessage = 'error message';
      var expectedMetaData = 'metadata';
      var logger = logging.getLogger();
      logger.error(expectedMessage, expectedMetaData);

      var message = console.error.args[0][0];
      expect(logMessageRegex.test(message)).to.be.false;
      expect(message).to.equal(expectedMessage + '\n  ' + expectedMetaData);
    });

    it('should generate timestamp with negative timezone offset', () => {
      var rewiredLogger = rewire('../../lib/logger');
      var createTimestamp = rewiredLogger.__get__('createTimestamp');

      var date = new Date();
      sinon.stub(date, 'getTimezoneOffset').returns(60);
      var stamp = createTimestamp(date);

      var groups = stamp.match(timestampRegex);
      expect(groups[3]).to.equal('-01:00');
    });

    it('should generate timestamp with positive timezone offset', () => {
      var rewiredLogger = rewire('../../lib/logger');
      var createTimestamp = rewiredLogger.__get__('createTimestamp');

      var date = new Date();
      sinon.stub(date, 'getTimezoneOffset').returns(-60);
      var stamp = createTimestamp(date);

      var groups = stamp.match(timestampRegex);
      expect(groups[3]).to.equal('+01:00');
    });

    it('should generate timestamp with special timezone offset', () => {
      var rewiredLogger = rewire('../../lib/logger');
      var createTimestamp = rewiredLogger.__get__('createTimestamp');

      var date = new Date();
      sinon.stub(date, 'getTimezoneOffset').returns(108);
      var stamp = createTimestamp(date);

      var groups = stamp.match(timestampRegex);
      expect(groups[3]).to.equal('-01:48');
    });

    it('should generate correctly formatted timestamp', () => {
      var rewiredLogger = rewire('../../lib/logger');
      var createTimestamp = rewiredLogger.__get__('createTimestamp');

      var date = new Date(1576877599000);  // 12/20/2019 @ 9:33pm (UTC)
      sinon.stub(date, 'getTimezoneOffset').returns(0);
      var stamp = createTimestamp(date);
      var expected = '2019-12-20 21:33:19.000 +00:00';

      expect(stamp).to.equal(expected);
    });
  });
});
