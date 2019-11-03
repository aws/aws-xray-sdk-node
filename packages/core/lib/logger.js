var format = require('date-fns/format');

var validLogLevels = [ 'debug', 'info', 'warn', 'error', 'silent' ];
var defaultLogLevel = validLogLevels.indexOf('error');
var logLevel = calculateLogLevel(process.env.AWS_XRAY_DEBUG_MODE ? 'debug' : process.env.AWS_XRAY_LOG_LEVEL);

var logger = {
  error: createLoggerForLevel('error'),
  info: createLoggerForLevel('info'),
  warn: createLoggerForLevel('warn'),
  debug: createLoggerForLevel('debug'),
};

/* eslint-disable no-console */
function createLoggerForLevel(level) {
  var loggerLevel = validLogLevels.indexOf(level);
  var consoleMethod = console[level] || console.log || (() => {});

  if (loggerLevel >= logLevel) {
    return (message, meta) => consoleMethod(formatLogMessage(level, message, meta));
  } else {
    return () => {};
  }
}
/* eslint-enable no-console */

function calculateLogLevel(level) {
  if (level) {
    var normalisedLevel = level.toLowerCase();
    var index = validLogLevels.indexOf(normalisedLevel);
    return index >= 0 ? index : defaultLogLevel;
  }

  // Silently ignore invalid log levels, default to default level
  return defaultLogLevel;
}

function createTimestamp() {
  return format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS Z');
}

function formatLogMessage(level, message, meta) {
  return createTimestamp() +' [' + level.toUpperCase() + '] ' +
    (message ? message : '') +
    formatMetaData(meta);
}

function formatMetaData(meta) {
  if (!meta) {
    return '';
  }

  return '\n  ' + ((typeof(meta) === 'string') ? meta : JSON.stringify(meta));
}

var logging = {
  setLogger: function setLogger(logObj) {
    logger = logObj;
  },

  getLogger: function getLogger() {
    return logger;
  }
};

module.exports = logging;
