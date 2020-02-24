var CallCapturer = require('../../patchers/call_capturer.js');

var capturer = new CallCapturer();

/**
 * Represents a AWS client call. Automatically captures data from the supplied response object,
 * Data captured depends on the whitelisting file supplied.
 * The base whitelisting file can be found at /lib/resources/aws_whitelist.json.
 * @constructor
 * @param {any} res - The response object from the AWS call. Typed as any to avoid AWS SDK dependency. Otherwise would be AWS.Response.
 * @param {string} serviceName - The service name of the AWS client.
 * @see https://github.com/aws/aws-sdk-js/blob/master/lib/response.js
 */

function Aws(res, serviceName) {
  this.init(res, serviceName);
}

Aws.prototype.init = function init(res, serviceName) {
  //TODO: account ID
  this.operation = formatOperation(res.request.operation) || '';
  this.region = res.request.httpRequest.region || '';
  this.request_id = res.requestId || '';
  this.retries = res.retryCount || 0;

  if (res.extendedRequestId && serviceName === 's3')
    this.id_2 = res.extendedRequestId;

  this.addData(capturer.capture(serviceName, res));
};

Aws.prototype.addData = function addData(data) {
  for (var attribute in data) { this[attribute] = data[attribute]; }
};

/**
 * Overrides the default whitelisting file to specify what params to capture on each AWS Service call.
 * @param {string|Object} source - The path to the custom whitelist file, or a whitelist source JSON object.
 * @exports setAWSWhitelist
 */

var setAWSWhitelist = function setAWSWhitelist(source) {
  if (!source || source instanceof String || !(typeof source === 'string' || (source instanceof Object)))
    throw new Error('Please specify a path to the local whitelist file, or supply a whitelist source object.');

  capturer = new CallCapturer(source);
};

/**
 * Appends to the default whitelisting file to specify what params to capture on each AWS Service call.
 * @param {string|Object} source - The path to the custom whitelist file, or a whitelist source JSON object.
 * @exports appendAWSWhitelist
 */

var appendAWSWhitelist = function appendAWSWhitelist(source) {
  if (!source || source instanceof String || !(typeof source === 'string' || (source instanceof Object)))
    throw new Error('Please specify a path to the local whitelist file, or supply a whitelist source object.');

  capturer.append(source);
};

function formatOperation(operation) {
  if (!operation)
    return;

  return operation.charAt(0).toUpperCase() + operation.slice(1);
}

module.exports = Aws;
module.exports.appendAWSWhitelist = appendAWSWhitelist;
module.exports.setAWSWhitelist = setAWSWhitelist;
