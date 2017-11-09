var expect = require('chai').expect;
var nock = require('nock');

var Plugin = require('../../../../lib/segments/plugins/plugin');

describe('Plugin', function() {
  describe('#getPluginMetadata', function() {
    var METADATA_HOST = 'http://localhost';
    var METADATA_PATH = '/index';

    var OPTIONS = {
      host: 'localhost',
      path: '/index'
    };

    var data = { data: 1234 };
    var getPluginMetadata = Plugin.getPluginMetadata;

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

    it('should retry on 4xx', function(done) {
      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .times(3)
        .reply(400)
        .get(METADATA_PATH)
        .reply(200, data);

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data.data).not.to.be.empty;
        getMetadata.done();
        done();
      });
    });

    it('should retry on 4xx 20 times then error out', function(done) {
      this.timeout(12000);

      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .times(21)
        .reply(400);

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data).to.be.empty;
        getMetadata.done();
        done();
      });
    });

    it('should fast fail on any other status code', function(done) {
      getMetadata = nock(METADATA_HOST)
        .get(METADATA_PATH)
        .reply(500);

      getPluginMetadata(OPTIONS, function(err, data) {
        expect(data).to.be.empty;
        getMetadata.done();
        done();
      });
    });
  });
});
