var http = require('http');

var Plugin = {
  METADATA_TIMEOUT: 1000, // Millis

  /**
   * Asynchronously retrieves metadata from on-instance endpoint with an HTTP request using retries for
   * requests that time out.
   * @param {object} options - The HTTP options to make the request with
   * @param {function} callback - callback to plugin
   */
  getPluginMetadata: function(options, callback) {
    const METADATA_RETRY_TIMEOUT = 250; // Millis
    const METADATA_RETRIES = 5;

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
            try {
              body = JSON.parse(body);
            } catch (e) {
              callback(e);
              return;
            }
            
            callback(null, body);
          } else if (retries > 0 && Math.floor(this.statusCode / 100) === 5) {
            retries--;
            setTimeout(getMetadata, METADATA_RETRY_TIMEOUT);
          } else {
            callback(new Error(`Failed to retrieve metadata with options: ${options}`));
          }
        });
      });

      req.on('error', function(err) {
        callback(err);
      });

      req.on('timeout', function() {
        req.abort();
      });

      req.setTimeout(Plugin.METADATA_TIMEOUT);
      req.end();
    };

    getMetadata();
  }
};

module.exports = Plugin;
