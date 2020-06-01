var Plugin = require('./plugin');
var logger = require('../../logger');
var http = require('http');

var EC2Plugin = {
  /**
   * A function to get the instance data from the EC2 metadata service.
   * @param {function} callback - The callback for the plugin loader.
   */
  getData: function(callback) {
    const METADATA_PATH = '/latest/dynamic/instance-identity/document';

    function populateMetadata(token) {
      const options = getOptions(
        METADATA_PATH,
        'GET',
        token ? { 'X-aws-ec2-metadata-token': token } : {}
      );

      Plugin.getPluginMetadata(options, function(err, data) {
        if (err || !data) {
          logger.getLogger().error('Error loading EC2 plugin metadata: ', err ? err.toString() : 'Could not retrieve data from IMDS.');
          callback();
          return;
        }

        const metadata = {
          ec2: {
            instance_id: data.instanceId,
            availability_zone: data.availabilityZone,
            instance_size: data.instanceType,
            ami_id: data.imageId
          }
        };
        callback(metadata);
      });
    }

    /**
     * This kicks off a requet to get a token used for requests to IMDSv2. If the request for the token 
     * fails, we fall back to IMDSv1. Otherwise, the token will be used for an IMDSv2 request.
     */
    getToken(function(token) {
      if (token === null) {
        logger.getLogger().debug('EC2Plugin failed to get token from IMDSv2. Falling back to IMDSv1.');
      }

      populateMetadata(token);
    });
  },
  originName: 'AWS::EC2::Instance'
};

/**
 * Asynchronously retrieves a token used in requests to EC2 instance metadata service.
 * @param {function} callback - callback to plugin
 */
function getToken(callback) {
  const httpReq = http.__request ? http.__request : http.request;
  const TTL = 60; //seconds
  const TOKEN_PATH = '/latest/api/token';
  const options = getOptions(TOKEN_PATH, 'PUT', {
    'X-aws-ec2-metadata-token-ttl-seconds': TTL
  });

  let req = httpReq(options, function(res) {
    let body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      if (this.statusCode === 200 || this.statusCode === 300) {
        callback(body);
      } else {
        callback(null);
      }
    });
  });

  req.on('error', function() {
    callback(null);
  });

  req.on('timeout', function() {
    req.abort();
    callback(null);
  });

  req.setTimeout(Plugin.METADATA_TIMEOUT);
  req.end();
}

function getOptions(path, method, headers) {
  if (!method) {
    method = 'GET';
  }

  if (!headers) {
    headers = {};
  }

  return {
    host: '169.254.169.254',
    path: path,
    method: method,
    headers: headers
  };
}

module.exports = EC2Plugin;
