var format = require('date-fns/format');

var validLogLevels = [ 'trace', 'debug', 'info', 'warn', 'error'  ];
var logLevel = calculateLogLevel(process.env.AWS_XRAY_DEBUG_MODE ? 'debug' : process.env.AWS_XRAY_LOG_LEVEL);

var logger = {
  error: createLoggerForLevel('error'),
  info: createLoggerForLevel('info'),
  warn: createLoggerForLevel('warn'),
  debug: createLoggerForLevel('debug'),
  setLevel: (level) => logLevel = calculateLogLevel(level),
  getLevel: () => validLogLevels[logLevel]
};

/* eslint-disable no-console */
function createLoggerForLevel(level) {
  var loggerLevel = validLogLevels.indexOf(level);
  var consoleMethod = console[level] || console.log || (() => {})
  return (message, meta) => {
    if (loggerLevel >= logLevel) {
      consoleMethod(formatLogMessage(level, message, meta));
    }
  };
}
/* eslint-enable no-console */

function calculateLogLevel(level) {
  if (level) {
    var normalisedLevel = level.toLowerCase();
    var index = validLogLevels.indexOf(normalisedLevel);
    return index >= 0 ? index : validLogLevels.length - 1;
  }

  // Silently ignore invalid log levels, default to highest level
  return validLogLevels.length - 1;
}

function createTimestamp() {
  return format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS Z');
}

function formatLogMessage(level, message, meta) {
  return createTimestamp() +' [' + level.toUpperCase() + '] ' +
    (message !== undefined ? message : '') +
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
