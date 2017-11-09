var fs = require('fs');

var logger = require('../logger');
var whitelist = require('../resources/aws_whitelist.json');

var paramTypes = {
  REQ_DESC: 'request_descriptors',
  REQ_PARAMS: 'request_parameters',
  RES_DESC: 'response_descriptors',
  RES_PARAMS: 'response_parameters'
};

/**
 * Represents a set of AWS services, operations and keys or params to capture.
 * @constructor
 * @param {string|Object} [source] - The location or source JSON object of the custom AWS whitelist file. If none is provided, the default file will be used.
 */

function CallCapturer (source) {
  this.init(source);
}

CallCapturer.prototype.init = function init(source) {
  if (source) {
    if (typeof source === 'string') {
      logger.getLogger().info('Using custom AWS whitelist file: ' + source);
      this.services = loadWhitelist(JSON.parse(fs.readFileSync(source, 'utf8')));
    } else {
      logger.getLogger().info('Using custom AWS whitelist source.');
      this.services = loadWhitelist(source);
    }
  } else
    this.services = whitelist.services;
};

CallCapturer.prototype.append = function append(source) {
  var newServices = {};

  if (typeof source === 'string') {
    logger.getLogger().info('Appending AWS whitelist with custom file: ' + source);
    newServices = loadWhitelist(require(source));
  } else {
    logger.getLogger().info('Appending AWS whitelist with a custom source.');
    newServices = loadWhitelist(source);
  }

  for (var attribute in newServices) { this.services[attribute] = newServices[attribute]; }
};

CallCapturer.prototype.capture = function capture(serviceName, response) {
  var operation = response.request.operation;
  var call = this.services[serviceName] !== undefined ? this.services[serviceName].operations[operation] : null;

  if (call === null) {
    logger.getLogger().debug('Call "' + serviceName + '.' + operation + '" is not whitelisted for additional data capturing. Ignoring.');
    return;
  }

  var dataCaptured = {};

  for (var paramType in call) {
    var params = call[paramType];

    if (paramType === paramTypes.REQ_PARAMS) {
      captureCallParams(params, response.request.params, dataCaptured);
    } else if (paramType === paramTypes.REQ_DESC) {
      captureDescriptors(params, response.request.params, dataCaptured);
    } else if (paramType === paramTypes.RES_PARAMS) {
      if (response.data) { captureCallParams(params, response.data, dataCaptured); }
    } else if (paramType === paramTypes.RES_DESC) {
      if (response.data) { captureDescriptors(params, response.data, dataCaptured); }
    } else {
      logger.getLogger().error('Unknown parameter type "' + paramType + '". Must be "request_descriptors", "response_descriptors", ' +
        '"request_parameters" or "response_parameters".');
    }
  }

  return dataCaptured;
};

function captureCallParams(params, call, data) {
  params.forEach(function(param) {
    if (typeof call[param] !== 'undefined') {
      var formatted = toSnakeCase(param);
      this[formatted] = call[param];
    }
  }, data);
}

function captureDescriptors(descriptors, params, data) {
  for (var paramName in descriptors) {
    var attributes = descriptors[paramName];

    if (typeof params[paramName] !== 'undefined') {
      var paramData;

      if (attributes.list && attributes.get_count)
        paramData = params[paramName] ? params[paramName].length : 0;
      else
        paramData = attributes.get_keys === true ? Object.keys(params[paramName]) : params[paramName];

      if (typeof attributes.rename_to === 'string') {
        data[attributes.rename_to] = paramData;
      } else {
        var formatted = toSnakeCase(paramName);
        data[formatted] = paramData;
      }
    }
  }
}

function toSnakeCase(param) {
  if (param === 'IPAddress')
    return 'ip_address';
  else
    return param.split(/(?=[A-Z])/).join('_').toLowerCase();
}

function loadWhitelist(source) {
  var doc = source;

  if (doc.services === undefined)
    throw new Error('Document formatting is incorrect. Expecting "services" param.');

  return doc.services;
}

module.exports = CallCapturer;
