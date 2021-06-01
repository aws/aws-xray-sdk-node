const { safeParseInt } = require('../utils');
var logger = require('../logger');

var DEFAULT_STREAMING_THRESHOLD = 100;

var utils = {
  streamingThreshold: DEFAULT_STREAMING_THRESHOLD,

  getCurrentTime: function getCurrentTime() {
    return Date.now() / 1000;
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
    if (isFinite(threshold) && threshold >= 0) {
      utils.streamingThreshold = threshold;
      logger.getLogger().debug('Subsegment streaming threshold set to: ' + threshold);
    } else {
      logger.getLogger().error('Invalid threshold: ' + threshold + '. Must be a whole number >= 0.');
    }
  },

  getStreamingThreshold: function getStreamingThreshold() {
    return utils.streamingThreshold;
  },

  /**
   * Parses an HTTP response object to return an X-Ray compliant HTTP response object.
   * @param {http.ServerResponse} res
   * @returns {Object} - X-Ray response object to be added to (sub)segment
   */
  getHttpResponseData: (res) => {
    const ret = {};
    if (!res) {
      return ret;
    }

    const status = safeParseInt(res.statusCode);
    if (status !== 0) {
      ret.status = status;
    }
    if (res.headers && res.headers['content-length']) {
      ret.content_length = safeParseInt(res.headers['content-length']);
    }
    return ret;
  }
};

module.exports = utils;
