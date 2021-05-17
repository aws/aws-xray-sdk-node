const { getHttpResponseData } = require('../segment_utils');
var { stripQueryStringFromPath } = require('../../utils');

/**
 * Represents an outgoing HTTP/HTTPS call.
 * @constructor
 * @param {http.ClientRequest|https.ClientRequest} req - The request object from the HTTP/HTTPS call.
 * @param {http.IncomingMessage|https.IncomingMessage} res - The response object from the HTTP/HTTPS call.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced": true hint to generated subsegments such that the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @param {object} [options] - Optional HTTP Request options, which will take precedence over header data to populate request metadata.
 */

function RemoteRequestData(req, res, downstreamXRayEnabled, options) {
  this.init(req, res, downstreamXRayEnabled, options);
}

RemoteRequestData.prototype.init = function init(req, res, downstreamXRayEnabled, options) {
  const useOptionsHost = options && options.hostname;
  this.request = {
    url: (req.agent && req.agent.protocol) ? (req.agent.protocol + '//' + (useOptionsHost ? options.hostname : req.getHeader('host')) +  stripQueryStringFromPath(req.path)) : '',
    method: req.method || '',
  };

  if (downstreamXRayEnabled) {
    this.request.traced = true;
  }

  if (res) {
    this.response = getHttpResponseData(res);
  }
};

module.exports = RemoteRequestData;
