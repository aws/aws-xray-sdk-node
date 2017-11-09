var Plugin = require('./plugin');

var logger = require('../../logger');

var EC2Plugin = {
  /**
   * A function to get the instance data from the EC2 metadata service.
   * @param {function} callback - The callback for the plugin loader.
   */

  getData: function(callback) {
    var METADATA_OPTIONS = {
      host: '169.254.169.254',
      path: '/latest/dynamic/instance-identity/document'
    };

    Plugin.getPluginMetadata(METADATA_OPTIONS, function(err, data) {
      if (err) {
        logger.getLogger().error('Error loading EC2 plugin: ', err.stack);
        callback();
      } else {
        var metadata = { ec2: { instance_id: data.instanceId, availability_zone: data.availabilityZone }};
        callback(metadata);
      }
    });
  },
  originName: 'AWS::EC2::Instance'
};

module.exports = EC2Plugin;
