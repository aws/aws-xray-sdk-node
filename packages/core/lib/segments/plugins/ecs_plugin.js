var os = require('os');

var ECSPlugin = {
  /**
   * A function to get the instance data from the ECS instance.
   * @param {function} callback - The callback for the plugin loader.
   */
  getData: function(callback) {
    callback({ ecs: { container: os.hostname() }});
  },
  originName: 'AWS::ECS::Container'
};

module.exports = ECSPlugin;
