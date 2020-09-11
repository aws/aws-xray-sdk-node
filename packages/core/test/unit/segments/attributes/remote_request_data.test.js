var assert = require('chai').assert;
var chai = require('chai');

var RemoteRequestData = require('../../../../lib/segments/attributes/remote_request_data');

chai.should();

describe('RemoteRequestData', function() {
  const defaultRequest = {
    protocol: 'https',
    agent: {
      protocol: 'https:'
    },
    getHeader: function() {
      return 'host.com';
    },
    path: '/path/to/resource'
  };

  const defaultResponse = {
    statusCode: 200,
    headers: {
      'content-length': 10,
    }
  };

  var request = defaultRequest;
  var response = defaultResponse;

  this.beforeEach(function () {
    request = defaultRequest;
    response = defaultResponse;
  });

  describe('#constructor', function() {
    it('should mask out query string in path', function() {
      const requestWithPathQueryString = Object.assign(request, { path: '/path/to/resource?qs=qs' });
      
      assert.propertyVal(
        new RemoteRequestData(requestWithPathQueryString, response, true).request,
        'url',
        'https://host.com/path/to/resource'
      );
    });
    it('should use req.protocol if agent is unavailable', function() {
      const requestWithoutAgent = Object.assign(request, {
        protocol: 'ftp'
      });
      delete requestWithoutAgent.agent
      
      assert.propertyVal(
        new RemoteRequestData(requestWithoutAgent, response, true).request,
        'url',
        'ftp://host.com/path/to/resource'
      );
    });
  });
});
