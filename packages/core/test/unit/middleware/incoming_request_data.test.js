var assert = require('chai').assert;
var IncomingRequestData = require('../../../lib/middleware/incoming_request_data');

describe('IncomingRequestData', function() {
  var req;

  beforeEach(function() {
    req = { headers: {} };
    req.connection = {};
    req.headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6)';
    req.headers['host'] = 'reqDatahost:8081';
    req.url = '/';
  });

  describe('#init', function() {
    it('should create a new reqData object', function() {
      var reqData = new IncomingRequestData(req);

      assert.isObject(reqData);
    });

    it('should set the user agent', function() {
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.user_agent, req.headers['user-agent']);
    });

    it('should set the construct the URL to HTTP by default', function() {
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.url, 'http://' + req.headers['host'] + req.url);
    });

    it('should set the construct the URL to HTTPS when req.connection.encrypted is set', function() {
      req.connection.encrypted = true;
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.url, 'https://' + req.headers['host'] + req.url);
    });

    it('should set the construct the URL to HTTPS when req.connection.secure is set', function() {
      req.connection.secure = true;
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.url, 'https://' + req.headers['host'] + req.url);
    });

    it('should use the connection.remoteAddress property by for the client IP', function() {
      var address = '::1';
      req.connection.remoteAddress = address;
      req.connection.socket = { remoteAddress: 'donotuse' };

      req.socket = { remoteAddress: 'donotuse' };

      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.client_ip, address);
      assert.notProperty(reqData.request, 'x_forwarded_for');
    });

    it('should use the socket.remoteAddress property by for the client IP', function() {
      var address = '192.168.1.150:1337';
      req.connection.socket = { remoteAddress: 'donotuse' };
      req.socket = { remoteAddress: address };
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.client_ip, address);
      assert.notProperty(reqData.request, 'x_forwarded_for');
    });

    it('should use the connection.socket.remoteAddress property by for the client IP', function() {
      var address = '192.168.1.49:8080';
      req.connection.socket = { remoteAddress: address };
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.client_ip, address);
      assert.notProperty(reqData.request, 'x_forwarded_for');
    });

    it('should use the x-forwarded-for header if used and flag it', function() {
      req.headers['x-forwarded-for'] = 'client2, proxy2';
      req.connection.socket = { remoteAddress: 'donotuse' };
      var reqData = new IncomingRequestData(req);

      assert.equal(reqData.request.client_ip, 'client2');
      assert.propertyVal(reqData.request, 'x_forwarded_for', true);
    });
  });

  describe('#close', function() {
    var res;

    beforeEach(function() {
      res = { headers: {} };
      res.statusCode = 403;
    });

    it('should capture the response status code', function() {
      var reqData = new IncomingRequestData(req);
      reqData.close(res);

      assert.equal(reqData.response.status, res.statusCode);
      assert.notProperty(reqData.response, 'content_length');
    });

    it('should capture the content-length if set', function() {
      res.headers['content-length'] = 5637;
      var reqData = new IncomingRequestData(req);
      reqData.close(res);

      assert.equal(reqData.response.content_length, res.headers['content-length']);
    });
  });
});
