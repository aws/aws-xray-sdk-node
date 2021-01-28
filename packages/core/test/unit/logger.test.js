const expect = require('chai').expect;
const rewire = require('rewire');
const sinon = require('sinon');
let logging = require('../../lib/logger');

describe('logger', function () {
  const spies = [];

  function reloadLogger() {
    const path = '../../lib/logger';
    spies.length = 0;
    spies.push(sinon.spy(console, 'error'));
    spies.push(sinon.spy(console, 'warn'));
    spies.push(sinon.spy(console, 'info'));
    spies.push(sinon.spy(console, 'log'));

    if (console.debug) {
      spies.push(sinon.spy(console, 'debug'));
    }

    delete require.cache[require.resolve(path)];
    logging = require(path);
  }

  afterEach(function() {
    sinon.restore();
  });

  describe('console logging methods', function () {
    beforeEach(function() {
      process.env.AWS_XRAY_DEBUG_MODE = 'debug';
      reloadLogger();
    });

    after(function() {
      delete process.env.AWS_XRAY_DEBUG_MODE;
    });

    it('Should send debug logs to console.debug', function () {
      logging.getLogger().debug('test');

      if (console.debug) {
        sinon.assert.calledOnce(console.debug);
      } else {
        sinon.assert.calledOnce(console.log);
      }
    });

    it('Should send info logs to console.info', function () {
      logging.getLogger().info('test');
      sinon.assert.calledOnce(console.info);
    });

    it('Should send warn logs to console.warn', function () {
      logging.getLogger().warn('test');
      sinon.assert.calledOnce(console.warn);
    });

    it('Should sent error logs to console.error', function () {
      logging.getLogger().error('test');
      sinon.assert.calledOnce(console.error);
    });
  });

  describe('console logging filters', function () {
    function sendLogMessages() {
      const logger = logging.getLogger();
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
      spies.forEach(spy => sinon.assert.notCalled(spy));
    });

    it('Should only emit error logs if level is error', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'error';
      reloadLogger();

      sendLogMessages();
      sinon.assert.calledOnce(console.error);
      spies.filter(spy => spy !== console.error)
        .forEach(spy => sinon.assert.notCalled(spy));
    });

    it('Should emit error and warn logs if level is warn', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'warn';
      reloadLogger();

      sendLogMessages();
      const expected = [ console.error, console.warn ];
      expected.forEach(spy => sinon.assert.called(spy));
      spies.filter(spy => !expected.includes(spy))
        .forEach(spy => sinon.assert.notCalled(spy));
    });

    it('Should emit error, warn, and info logs if level is info', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'info';
      reloadLogger();

      sendLogMessages();
      const expected = [ console.error, console.warn, console.info ];
      expected.forEach(spy => sinon.assert.called(spy));
      spies.filter(spy => !expected.includes(spy))
        .forEach(spy => sinon.assert.notCalled(spy));
    });

    it('Should emit all logs if level is debug', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'debug';
      reloadLogger();

      sendLogMessages();
      const filterMethod = console.debug ? (spy) => spy !== console.log : () => true;
      spies.filter(filterMethod).forEach(spy => sinon.assert.called(spy));
    });

    it('Should default to error if invalid log level', function () {
      process.env.AWS_XRAY_LOG_LEVEL = 'not_a_level';
      reloadLogger();

      sendLogMessages();
      sinon.assert.calledOnce(console.error);
      spies.filter(spy => spy !== console.error)
        .forEach(spy => sinon.assert.notCalled(spy));
    });

    it('Should default to error if no log level', function () {
      reloadLogger();

      sendLogMessages();
      sinon.assert.calledOnce(console.error);
      spies.filter(spy => spy !== console.error)
        .forEach(spy => sinon.assert.notCalled(spy));
    });
  });

  describe('console logging format', function () {
    const logMessageRegex = /(\d{4}-[01]\d-[0-3]\d) ([0-2]\d:[0-5]\d:[0-5]\d\.\d+) ([+-][0-2]\d:[0-5]\d) \[(\w+)\](.*)/;
    const timestampRegex = /(\d{4}-[01]\d-[0-3]\d) ([0-2]\d:[0-5]\d:[0-5]\d\.\d+) ([+-][0-2]\d:[0-5]\d)/;

    beforeEach(function() {
      reloadLogger();
    });

    afterEach(function() {
      delete process.env.LAMBDA_TASK_ROOT;
    });

    it('should output error message', () => {
      const logger = logging.getLogger();
      const expectedMessage = 'error message';
      logger.error(expectedMessage);

      const message = console.error.args[0][0];
      const groups = message.match(logMessageRegex);
      expect(groups[4]).to.equal('ERROR');
      expect(groups[5].trim()).to.equal(expectedMessage);
    });

    it('should not output if message and meta falsey', () => {
      const logger = logging.getLogger();
      logger.error();
      logger.error(null);
      logger.error('', null);

      spies.forEach(spy => sinon.assert.notCalled(spy));
    });

    it('should convert falsey value to empty string', () => {
      const logger = logging.getLogger();
      logger.error(null, {});

      const message = console.error.args[0][0];
      const groups = message.match(logMessageRegex);
      expect(groups[4]).to.equal('ERROR');
      expect(groups[5]).to.equal('');
    });

    it('should not add timestamp to lambda errors', () => {
      process.env.LAMBDA_TASK_ROOT = 'on';
      const expectedMessage = 'error message';
      const logger = logging.getLogger();
      logger.error(expectedMessage);

      sinon.assert.called(console.error);
      const message = console.error.args[0][0];
      expect(logMessageRegex.test(message)).to.be.false;
      expect(message).to.equal(expectedMessage);
    });

    it('should only output metadata for lambda with no message', () => {
      process.env.LAMBDA_TASK_ROOT = 'on';
      const expectedMetaData = 'this is some metadata';
      const logger = logging.getLogger();
      logger.error(null, expectedMetaData);

      const message = console.error.args[0][0];
      expect(logMessageRegex.test(message)).to.be.false;
      expect(message).to.equal(expectedMetaData);
    });

    it('should output both message and metadata for lambda', () => {
      process.env.LAMBDA_TASK_ROOT = 'on';
      const expectedMessage = 'error message';
      const expectedMetaData = 'metadata';
      const logger = logging.getLogger();
      logger.error(expectedMessage, expectedMetaData);

      const message = console.error.args[0][0];
      expect(logMessageRegex.test(message)).to.be.false;
      expect(message).to.equal(expectedMessage + '\n  ' + expectedMetaData);
    });

    it('should generate timestamp with negative timezone offset', () => {
      const rewiredLogger = rewire('../../lib/logger');
      const createTimestamp = rewiredLogger.__get__('createTimestamp');

      const date = new Date();
      sinon.stub(date, 'getTimezoneOffset').returns(60);
      const stamp = createTimestamp(date);

      const groups = stamp.match(timestampRegex);
      expect(groups[3]).to.equal('-01:00');
    });

    it('should generate timestamp with positive timezone offset', () => {
      const rewiredLogger = rewire('../../lib/logger');
      const createTimestamp = rewiredLogger.__get__('createTimestamp');

      const date = new Date();
      sinon.stub(date, 'getTimezoneOffset').returns(-60);
      const stamp = createTimestamp(date);

      const groups = stamp.match(timestampRegex);
      expect(groups[3]).to.equal('+01:00');
    });

    it('should generate timestamp with special timezone offset', () => {
      const rewiredLogger = rewire('../../lib/logger');
      const createTimestamp = rewiredLogger.__get__('createTimestamp');

      const date = new Date();
      sinon.stub(date, 'getTimezoneOffset').returns(108);
      const stamp = createTimestamp(date);

      const groups = stamp.match(timestampRegex);
      expect(groups[3]).to.equal('-01:48');
    });

    it('should generate correctly formatted timestamp', () => {
      const rewiredLogger = rewire('../../lib/logger');
      const createTimestamp = rewiredLogger.__get__('createTimestamp');

      const date = new Date(1576877599000);  // 12/20/2019 @ 9:33pm (UTC)
      sinon.stub(date, 'getTimezoneOffset').returns(0);
      const stamp = createTimestamp(date);
      const expected = '2019-12-20 21:33:19.000 +00:00';

      expect(stamp).to.equal(expected);
    });
  });
});
