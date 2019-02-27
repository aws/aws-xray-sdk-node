var expect = require('chai').expect;
var sinon = require('sinon');
var XRay = require('aws-sdk/clients/xray');
var AWS = require('aws-sdk/global');
var AWSXRay = require('../../lib/index');
var ServiceConnector = require('../../lib/middleware/sampling/service_connector');

function generateXrayClient() {
  var client = new XRay({
    region: 'mock-region',
    credentials: {
      accessKeyId: 'akid',
      secretAccessKey: 'secret',
      sessionToken: 'session'
    },
    endpoint: 'http://localhost:3000'
  });

  // remove events that require network calls
  client.makeUnauthenticatedRequest = function(operation, params, cb) {
    var request = this.makeRequest(operation, params).toUnauthenticated();
    request.removeAllListeners('send');
    request.removeListener('validateResponse', AWS.EventListeners.Core.VALIDATE_RESPONSE);
    request.removeListener('validate', AWS.EventListeners.Core.VALIDATE_PARAMETERS);
    request.removeAllListeners('extractData');
    request.on('validateResponse', function() {
      request.emit('success', request);
    });
    return request.send(cb);
  }
  
  return client;
}

describe('X-Ray AWS', function() {
  var sandbox;
  var client;
  before(function() {
    client = ServiceConnector.client;
    ServiceConnector.client = generateXrayClient();
  });

  after(function() {
    ServiceConnector.client = client;
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });
  
  afterEach(function() {
    sandbox.restore();
    // reset customizations
    XRay.prototype.customizeRequests(null);
  });

  describe('client patching', function() {
    it('should not affect the centralized sampling x-ray client', function(done) {
      AWSXRay.captureAWSClient(XRay.prototype);
      ServiceConnector.client.makeUnauthenticatedRequest('getSamplingTargets', {}, function(err, data) {
        expect(err).to.be.a('null');
        done();
      });
    });

    it('should affect non x-ray sdk clients', function() {
      AWSXRay.captureAWSClient(XRay.prototype);
      // expect to get a context missing error if the client is instrumented
      expect(function() {
        generateXrayClient().makeUnauthenticatedRequest('getSamplingTargets', {}, function(err, data) {})
          .to.throw(Error, 'Failed to get the current sub/segment from the context.');
      });
      
    });
  });
});