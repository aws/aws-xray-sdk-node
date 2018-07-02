var winston = require('winston');
var format = require('date-fns/format')

var logger;

if (process.env.AWS_XRAY_DEBUG_MODE) {
  logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        formatter: outputFormatter,
        level: 'debug',
        timestamp: timestampFormatter
      })
    ]
  });
} else {
  logger = new (winston.Logger)({});
}

/* eslint-disable no-console */
if (process.env.LAMBDA_TASK_ROOT) {
  logger.error = function(string) { console.error(string); };
  logger.info = function(string) { console.info(string); };
  logger.warn = function(string) { console.warn(string); };
}
/* eslint-enable no-console */

function timestampFormatter() {
  return format(new Date(), 'YYYY-MM-DD HH:mm:ss.SSS Z');
}

function outputFormatter(options) {
  return options.timestamp() +' [' + options.level.toUpperCase() + '] '+
    (options.message !== undefined ? options.message : '') +
    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
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
