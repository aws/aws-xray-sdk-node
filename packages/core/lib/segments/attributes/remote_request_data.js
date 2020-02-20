var { stripQueryStringFromPath } = require('../../utils');

/**
 * Represents an outgoing HTTP/HTTPS call.
 * @constructor
 * @param {http.ClientRequest|https.ClientRequest} req - The request object from the HTTP/HTTPS call.
 * @param {http.IncomingMessage|https.IncomingMessage} res - The response object from the HTTP/HTTPS call.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced": true hint to generated subsegments such that the AWS X-Ray service expects a corresponding segment from the downstream service.
 */

function RemoteRequestData(req, res, downstreamXRayEnabled) {
  this.init(req, res, downstreamXRayEnabled);
}

RemoteRequestData.prototype.init = function init(req, res, downstreamXRayEnabled) {
  this.request = {
    url: (req.agent.protocol + '//' + req.getHeader('host') +  stripQueryStringFromPath(req.path)) || '',
    method: req.method || '',
  };

  if (downstreamXRayEnabled) {
    this.request.traced = true;
  }

  if (res) {
    this.response = {
      status: res.statusCode || '',
      content_length: (res.headers && res.headers['content-length']) ? res.headers['content-length'] : 0
    };
  }
};

module.exports = RemoteRequestData;
