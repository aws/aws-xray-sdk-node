const { register } = require('./plugin');
const pjson = require('../package');
/**
 *
 * NPM Module
 */
module.exports = {
  /**
   *
   * HAPI Plugin
   */
  plugin: {
    name: 'hapi-xray',
    register,
    once: true,
    version: pjson.version
  }
};
