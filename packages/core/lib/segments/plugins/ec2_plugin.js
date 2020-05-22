var Plugin = require('./plugin');

var logger = require('../../logger');

var EC2Plugin = {
  /**
   * A function to get the instance data from the EC2 metadata service.
   * @param {function} callback - The callback for the plugin loader.
   */

  getData: function(callback) {
    const TOKEN_PATH = '/latest/api/token';
    const METADATA_PATH = '/latest/dynamic/instance-identity/document';

    function getMetadataToken() {
      const TTL = 60; //seconds
      const tokenOptions = getOptions(TOKEN_PATH, 'PUT', {
        'X-aws-ec2-metadata-token-ttl-seconds': TTL
      });

      Plugin.getToken(tokenOptions, function(err, data) {
        if (err) {
          logger.getLogger().debug('EC2Plugin failed to get token from IMDSv2. Falling back to IMDSv1.', err.toString());
          getV1Metadata();
        } else {
          // Successfully got token, use it for IMDSv2 metadata request
          getV2Metadata(data);
        }
      });
    }

    function getV2Metadata(token) {
      const options = getOptions(METADATA_PATH, 'GET', {
        'X-aws-ec2-metadata-token': token
      });

      Plugin.getPluginMetadata(options, function(err, data) {
        if (err) {
          logger.getLogger().debug('EC2Plugin failed to get metadata from IMDSv2. Falling back to IMDSv1.', err.toString())
          getV1Metadata();
        } else if (data) {
          const metadata = { ec2: { instance_id: data.instanceId, availability_zone: data.availabilityZone }};
          callback(metadata);
        } else {
          logger.getLogger().debug('Failed to get required EC2 metadata from IMDSv2. Falling back to IMDSv1.');
          getV1Metadata();
        }
      });
    }

    function getV1Metadata() {
      const options = getOptions('/latest/dynamic/instance-identity/document');
  
      Plugin.getPluginMetadata(options, function(err, data) {
        if (err) {
          logger.getLogger().error('Error loading EC2 plugin: ', err.toString());
          callback();
        } else if (data) {
          const metadata = { ec2: { instance_id: data.instanceId, availability_zone: data.availabilityZone }};
          callback(metadata);
        } else {
          logger.getLogger().error('Failed to get required EC2 metadata from IMDS');
          callback();
        }
      });
    }

    /**
     * This kicks off a requet to get a token used for requests to IMDSv2. If the request for the token or the 
     * v2 metadata itself fails, we fall back to IMDSv1.
     */
    getMetadataToken();
  },
  originName: 'AWS::EC2::Instance'
};

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
