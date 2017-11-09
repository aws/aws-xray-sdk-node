var fs = require('fs');

var logger = require('../../logger');

var ENV_CONFIG_LOCATION = '/var/elasticbeanstalk/xray/environment.conf';

var ElasticBeanstalkPlugin = {
  /**
   * A function to get data from the Elastic Beanstalk environment configuration file.
   * @param {function} callback - The callback for the plugin loader.
   */
  getData: function(callback) {
    fs.readFile(ENV_CONFIG_LOCATION, 'utf8', function(err, rawData) {
      if (err) {
        logger.getLogger().error('Error loading Elastic Beanstalk plugin:', err.stack);
        callback();
      } else {
        var data = JSON.parse(rawData);

        var metadata = {
          elastic_beanstalk: {
            environment: data.environment_name,
            version_label: data.version_label,
            deployment_id: data.deployment_id
          }
        };

        callback(metadata);
      }
    });
  },
  originName: 'AWS::ElasticBeanstalk::Environment'
};

module.exports = ElasticBeanstalkPlugin;
