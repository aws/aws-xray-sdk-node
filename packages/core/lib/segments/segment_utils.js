var _ = require('underscore');

var logger = require('../logger');

var DEFAULT_STREAMING_THRESHOLD = 100;

var utils = {
  streamingThreshold: DEFAULT_STREAMING_THRESHOLD,

  getCurrentTime: function getCurrentTime() {
    return new Date().getTime()/1000;
  },

  setOrigin: function setOrigin(origin) {
    this.origin = origin;
  },

  setPluginData: function setPluginData(pluginData) {
    this.pluginData = pluginData;
  },

  setSDKData: function setSDKData(sdkData) {
    this.sdkData = sdkData;
  },

  setServiceData: function setServiceData(serviceData) {
    this.serviceData = serviceData;
  },

  /**
   * Overrides the default streaming threshold (100).
   * The threshold represents the maximum number of subsegments on a single segment before
   * the SDK beings to send the completed subsegments out of band of the main segment.
   * Reduce this threshold if you see the 'Segment too large to send' error.
   * @param {number} threshold - The new threshold to use.
   * @memberof AWSXRay
   */

  setStreamingThreshold: function setStreamingThreshold(threshold) {
    if (_.isFinite(threshold) && threshold >= 0) {
      utils.streamingThreshold = threshold;
      logger.getLogger().info('Subsegment streaming threshold set to: ' + threshold);
    } else {
      logger.getLogger().error('Invalid threshold: ' + threshold + '. Must be a whole number >= 0.');
    }
  },

  getStreamingThreshold: function getStreamingThreshold() {
    return utils.streamingThreshold;
  }
};

module.exports = utils;
