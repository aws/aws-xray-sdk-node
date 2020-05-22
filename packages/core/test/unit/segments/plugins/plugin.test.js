var expect = require('chai').expect;
var assert = require('chai').assert;
var nock = require('nock');

var Plugin = require('../../../../lib/segments/plugins/plugin');

describe('Plugin', function() {
  const METADATA_HOST = 'http://localhost';
  
  describe('#getPluginMetadata', function() {
    var data = { data: 1234 };
    var getPluginMetadata = Plugin.getPluginMetadata;
    const METADATA_PATH = '/metadata';
    const OPTIONS = {
      host: 'localhost',
      path: '/metadata'
    };

    var getMetadata;

    it('should return metadata if 200 OK', function(done) {
      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .reply(200, data);

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data.data).not.to.be.empty;
        getMetadata.done();
        done();
      });
    });

    it('should retry on 5xx', function(done) {
      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .times(3)
        .reply(500)
        .get(METADATA_PATH)
        .reply(200, data);

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data.data).not.to.be.empty;
        getMetadata.done();
        done();
      });
    });

    it('should retry on 5xx 5 times then error out', function(done) {
      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .times(3)
        .reply(500)
        .get(METADATA_PATH)
        .times(3)
        .reply(504); // Ensure retry on different 5xx codes

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data).to.be.empty;
        getMetadata.done();
        done();
      });
    });

    it('should fast fail on 4xx status code', function(done) {
      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .reply(400);

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data).to.be.empty;
        getMetadata.done();
        done();
      });
    });
  });

  describe('#getToken', function() {
    const token = 'fancyToken';
    let getToken = Plugin.getToken;
    let getTokenRequest;
    const TOKEN_PATH = '/token';
    const TOKEN_OPTIONS = {
      host: 'localhost',
      path: '/token',
      method: 'PUT'
    }

    it('should return token on 200 OK', function(done) {
      getTokenRequest = nock(METADATA_HOST)
        .put(TOKEN_PATH)
        .reply(200, token);

      getToken(TOKEN_OPTIONS, function(err, data) {
        assert.isNull(err);
        assert.equal(data, token);
        getTokenRequest.done();
        done();
      });
    });

    it('should return an error on 4xx', function(done) {
      getTokenRequest = nock(METADATA_HOST)
        .put(TOKEN_PATH)
        .reply(400);

      getToken(TOKEN_OPTIONS, function(err, data) {
        assert.isNotNull(err);
        assert.isDefined(err);
        getTokenRequest.done();
        done();
      });
    });
  });
});
