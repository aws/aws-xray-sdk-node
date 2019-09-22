var format = require('date-fns/format');

var validLogLevelNames = [ 'trace', 'debug', 'info', 'warn', 'error', 'silent'  ];

// Log level to be used if no other or invalid level is specified.
var defaultLogLevel = calculateLogLevel('error');
var currentLogLevel = calculateLogLevel(process.env.AWS_XRAY_DEBUG_MODE ? 'debug' : process.env.AWS_XRAY_LOG_LEVEL);

var logger = {
  error: createLoggerForLevel('error'),
  info: createLoggerForLevel('info'),
  warn: createLoggerForLevel('warn'),
  debug: createLoggerForLevel('debug'),
  setLevel: (level) => currentLogLevel = calculateLogLevel(level),
  getLevel: () => validLogLevelNames[currentLogLevel]
};

/* eslint-disable no-console */
function createLoggerForLevel(levelName) {
  var loggerLevel = validLogLevelNames.indexOf(levelName);
  var consoleMethod = console[levelName] || console.log || (() => {});
  return (message, meta) => {
    if (loggerLevel >= currentLogLevel) {
      consoleMethod(formatLogMessage(levelName, message, meta));
    }
  };
}
/* eslint-enable no-console */

function calculateLogLevel(levelName) {
  var normalisedLevelName = (levelName || '').toLowerCase();
  var index = validLogLevelNames.indexOf(normalisedLevelName);

  // Silently ignore invalid log levels
  return index >= 0 ? index : defaultLogLevel;
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
