var http = require('http');

var Plugin = {
  getPluginMetadata: function(options, callback) {
    var METADATA_TIMEOUT = 1000;
    var METADATA_RETRY_TIMEOUT = 250;
    var METADATA_RETRIES = 20;

    var retries = METADATA_RETRIES;

    var getMetadata = function() {
      var httpReq = http.__request ? http.__request : http.request;

      var req = httpReq(options, function(res) {
        var body = '';

        res.on('data', function(chunk) {
          body += chunk;
        });
        res.on('end', function() {
          if (this.statusCode === 200 || this.statusCode === 300) {
            body = JSON.parse(body);
            callback(null, body);
          } else if (retries > 0 && this.statusCode === 400){
            retries--;
            setTimeout(getMetadata, METADATA_RETRY_TIMEOUT);
          } else { callback(); }
        });
      }).on('error', function(err) {
        callback(err);
      });

      req.on('socket', function(socket) {
        socket.on('timeout', function() {
          req.abort();
        });
        socket.setTimeout(METADATA_TIMEOUT);
      });

      req.end();
    };

    getMetadata();
  }
};

module.exports = Plugin;
