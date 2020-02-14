var validLogLevels = [ 'debug', 'info', 'warn', 'error', 'silent' ];
var defaultLogLevel = validLogLevels.indexOf('error');
var logLevel = calculateLogLevel(process.env.AWS_XRAY_DEBUG_MODE ? 'debug' : process.env.AWS_XRAY_LOG_LEVEL);

var logger = {
  error: createLoggerForLevel('error'),
  info: createLoggerForLevel('info'),
  warn: createLoggerForLevel('warn'),
  debug: createLoggerForLevel('debug'),
};

function createLoggerForLevel(level) {
  var loggerLevel = validLogLevels.indexOf(level);
  var consoleMethod = console[level] || console.log || (() => {});

  if (loggerLevel >= logLevel) {
    return (message, meta) => {
      if(message || meta) {
        consoleMethod(formatLogMessage(level, message, meta));
      }
    };
  } else {
    return () => {};
  }
}

function calculateLogLevel(level) {
  if (level) {
    var normalisedLevel = level.toLowerCase();
    var index = validLogLevels.indexOf(normalisedLevel);
    return index >= 0 ? index : defaultLogLevel;
  }

  // Silently ignore invalid log levels, default to default level
  return defaultLogLevel;
}

function createTimestamp(date) {
  var tzo = -date.getTimezoneOffset(),  // Negate to make this tzo = local - UTC
    dif = tzo >= 0 ? '+' : '-',
    pad = function(num) {
      var norm = Math.floor(Math.abs(num));
      return (norm < 10 ? '0' : '') + norm;
    };

  return new Date(date.getTime() + (tzo * 60 * 1000)).toISOString()
    .replace(/T/, ' ')
    .replace(/Z/, ' ') +
      dif + pad(tzo / 60) +
      ':' + pad(tzo % 60);
}

function isLambdaFunction() {
  return process.env.LAMBDA_TASK_ROOT !== undefined;
}

function formatLogMessage(level, message, meta) {
  var messageParts = [];

  if (!isLambdaFunction()) {
    messageParts.push(createTimestamp(new Date()));
    messageParts.push(`[${level.toUpperCase()}]`);
  }

  if (message) {
    messageParts.push(message);
  }

  var logString = messageParts.join(' ');
  var metaDataString = formatMetaData(meta);
  return [logString, metaDataString].filter(str => str.length > 0).join('\n  ');
}

function formatMetaData(meta) {
  if (!meta) {
    return '';
  }

  return ((typeof(meta) === 'string') ? meta : JSON.stringify(meta));
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
