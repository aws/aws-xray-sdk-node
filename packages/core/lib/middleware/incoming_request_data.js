
/**
 * Represents an incoming HTTP/HTTPS call.
 * @constructor
 * @param {http.IncomingMessage|https.IncomingMessage} req - The request object from the HTTP/HTTPS call.
 */

function IncomingRequestData(req) {
  this.init(req);
}

IncomingRequestData.prototype.init = function init(req) {
  var forwarded = !!req.headers['x-forwarded-for'];
  var url;

  if (req.connection)
    url = ((req.connection.secure || req.connection.encrypted) ? 'https://' : 'http://') +
      ((req.headers['host'] || '') + (req.url || ''));

  this.request = {
    method: req.method || '',
    user_agent: req.headers['user-agent'] || '',
    client_ip: getClientIp(req) || '',
    url: url || '',
  };

  if (forwarded)
    this.request.x_forwarded_for = forwarded;
};

var getClientIp = function getClientIp(req) {
  var clientIp;

  if (req.headers['x-forwarded-for'])
    clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0];
  else if (req.connection && req.connection.remoteAddress)
    clientIp = req.connection.remoteAddress;
  else if (req.socket && req.socket.remoteAddress)
    clientIp = req.socket.remoteAddress;
  else if (req.connection && req.connection.socket && req.connection.socket.remoteAddress)
    clientIp = req.connection.socket.remoteAddress;

  return clientIp;
};

/**
 * Closes the local and automatically captures the response data.
 * @param {http.ServerResponse|https.ServerResponse} res - The response object from the HTTP/HTTPS call.
 */

IncomingRequestData.prototype.close = function close(res) {
  this.response = {
    status: res.statusCode || ''
  };

  if (res.headers && res.headers['content-length'])
    this.response.content_length = res.headers['content-length'];
};

module.exports = IncomingRequestData;
