var winston = require('winston');
var format = require('date-fns/format');

var logger;
var xrayLogLevel = process.env.AWS_XRAY_LOG_LEVEL;

if (process.env.AWS_XRAY_DEBUG_MODE) {
  logger = createWinstonLogger('debug');
} else if (xrayLogLevel) {
  logger = createWinstonLogger(xrayLogLevel);
} else {
  logger = createWinstonLogger('info', true)
}

/* eslint-disable no-console */
if (process.env.LAMBDA_TASK_ROOT) {
  logger.error = function(string) { console.error(string); };
  logger.info = function(string) { console.info(string); };
  logger.warn = function(string) { console.warn(string); };
  logger.debug = function(string) { console.debug(string); };
}
/* eslint-enable no-console */

function outputFormatter() {
  return winston.format.printf((info) => {
    return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`
      + (info.meta && Object.keys(info.meta).length ? '\n\t'+ JSON.stringify(info.meta) : '' );
  })
}

function createWinstonLogger(level, silent) {
  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.metadata({ key: 'meta' }),
      winston.format.timestamp(),
      outputFormatter()
    ),
    transports: [ new winston.transports.Console({ silent }) ]
  });
}

/**
 * Polyfill for Object.keys
 * @see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys
 */

if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
      hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
      dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
      ],
      dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
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
