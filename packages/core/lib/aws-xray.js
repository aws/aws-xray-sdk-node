var contextUtils = require('./context_utils');
var logging = require('./logger');
var segmentUtils = require('./segments/segment_utils');
var utils = require('./utils');
var LambdaEnv = require('./env/aws_lambda');

var UNKNOWN = 'unknown';

var pkginfo = module.filename ? require('pkginfo') : function() {};
pkginfo(module);

/**
 * A module representing the AWSXRay SDK.
 * @namespace AWSXRay
 */

var AWSXRay = {

  /**
   * @memberof AWSXRay
   * @type {object}
   * @namespace AWSXRay.plugins
   */

  plugins: {

    /**
     * Exposes the AWS EC2 plugin.
     * @memberof AWSXRay.plugins
     */

    EC2Plugin: require('./segments/plugins/ec2_plugin'),

    /**
     * Exposes the AWS ECS plugin.
     * @memberof AWSXRay.plugins
     */

    ECSPlugin: require('./segments/plugins/ecs_plugin'),

    /**
     * Exposes the AWS Elastic Beanstalk plugin.
     * @memberof AWSXRay.plugins
     */

    ElasticBeanstalkPlugin: require('./segments/plugins/elastic_beanstalk_plugin'),
  },

  /**
   * Enables use of plugins to capture additional data for segments.
   * @param {Array} plugins - A configurable subset of AWSXRay.plugins.
   * @memberof AWSXRay
   * @see AWSXRay.plugins
   */

  config: function(plugins) {
    var pluginData = {};
    plugins.forEach(function(plugin) {
      plugin.getData(function(data) {
        if (data) {
          for (var attribute in data) { pluginData[attribute] = data[attribute]; }
        }
      });
      segmentUtils.setOrigin(plugin.originName);
      segmentUtils.setPluginData(pluginData);
    });
  },

  /**
   * Overrides the default whitelisting file to specify what params to capture on each AWS Service call.
   * If a service or API is not listed, no additional data is captured.
   * The base whitelisting file can be found at /lib/resources/aws_whitelist.json
   * @param {string|Object} source - The path to the custom whitelist file, or a whitelist source JSON object.
   * @memberof AWSXRay
   */

  setAWSWhitelist: require('./segments/attributes/aws').setAWSWhitelist,

  /**
   * Appends to the current whitelisting file.
   * In the case of a duplicate service API listed, the new source will override the previous values.
   * @param {string|Object} source - The path to the custom whitelist file, or a whitelist source JSON object.
   * @memberof AWSXRay
   */

  appendAWSWhitelist: require('./segments/attributes/aws').appendAWSWhitelist,

  /**
   * Overrides the default streaming threshold (100).
   * The threshold represents the maximum number of subsegments on a single segment before
   * the SDK begins to send the completed subsegments out of band of the main segment.
   * Reduce this threshold if you see the 'Segment too large to send' error.
   * @param {number} threshold - The new threshold to use.
   * @memberof AWSXRay
   */

  setStreamingThreshold: segmentUtils.setStreamingThreshold,

  /**
   * Set your own logger for the SDK.
   * @param {Object} logger - A logger which responds to debug/info/warn/error calls.
   * @memberof AWSXRay
   */

  setLogger: logging.setLogger,

  /**
   * Gets the set logger for the SDK.
   * @memberof AWSXRay
   */

  getLogger: logging.getLogger,

  /**
   * Configures the address and port the daemon is expected to be on.
   * @param {string} address - Address of the daemon the segments should be sent to.  Expects 'x.x.x.x', ':yyyy' or 'x.x.x.x:yyyy' IPv4 formats.
   * @module SegmentEmitter
   * @memberof AWSXRay
   * @function
   * @see module:SegmentEmitter.setDaemonAddress
   */

  setDaemonAddress: require('./segment_emitter').setDaemonAddress,

  /**
   * @param {string} name - The name of the new subsegment.
   * @param {function} fcn - The function conext to wrap.
   * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
   * @memberof AWSXRay
   * @function
   * @see module:capture.captureFunc
   */

  captureFunc: require('./capture').captureFunc,

  /**
   * @param {string} name - The name of the new subsegment.
   * @param {function} fcn - The function conext to wrap.
   * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
   * @memberof AWSXRay
   * @function
   * @see module:capture.captureAsyncFunc
   */

  captureAsyncFunc: require('./capture').captureAsyncFunc,

  /**
   * @param {string} name - The name of the new subsegment.
   * @param {function} fcn - The function conext to wrap.
   * @param {Segment|Subsegment} [parent] - The parent for the new subsegment, for manual mode.
   * @memberof AWSXRay
   * @function
   * @see module:capture.captureCallbackFunc
   */

  captureCallbackFunc: require('./capture').captureCallbackFunc,

  /**
   * @param {AWS} awssdk - The Javascript AWS SDK.
   * @memberof AWSXRay
   * @function
   * @see module:aws_p.captureAWS
   */

  captureAWS: require('./patchers/aws_p').captureAWS,

  /**
   * @param {AWS.Service} service - An instance of a AWS service to wrap.
   * @memberof AWSXRay
   * @function
   * @see module:aws_p.captureAWSClient
   */

  captureAWSClient: require('./patchers/aws_p').captureAWSClient,

  /**
   * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
   * @memberof AWSXRay
   * @function
   * @returns {http|https}
   * @see module:http_p.captureHTTPs
   */

  captureHTTPs: require('./patchers/http_p').captureHTTPs,

  /**
   * @param {http|https} module - The built in Node.js HTTP or HTTPS module.
   * @memberof AWSXRay
   * @function
   * @see module:http_p.captureHTTPsGlobal
   */

  captureHTTPsGlobal: require('./patchers/http_p').captureHTTPsGlobal,

  /**
   * Exposes various helper methods.
   * @memberof AWSXRay
   * @function
   * @see module:utils
   */

  utils: utils,

  /**
   * @memberof AWSXRay
   * @type {object}
   * @namespace AWSXRay.database
   */

  database: {

    /**
     * Exposes the SqlData class.
     * @memberof AWSXRay.database
     * @see SqlData
     */

    SqlData: require('./database/sql_data'),
  },

  /**
   * Exposes the Middleware Utils class.
   * @memberof AWSXRay
   * @function
   * @see module:mw_utils
   */

  middleware: require('./middleware/mw_utils'),

  /**
   * Gets the current namespace of the context.
   * Used for supporting functions that can be used in automatic mode.
   * @memberof AWSXRay
   * @function
   * @returns {Segment|Subsegment}
   * @see module:context_utils.getNamespace
   */

  getNamespace: contextUtils.getNamespace,

  /**
   * Resolves the current segment or subsegment, checks manual and automatic modes.
   * Used for supporting functions that can be used in both manual and automatic modes.
   * @memberof AWSXRay
   * @function
   * @returns {Segment|Subsegment}
   * @see module:context_utils.resolveSegment
   */

  resolveSegment: contextUtils.resolveSegment,

  /**
   * Returns the current segment or subsegment. For use with automatic mode only.
   * @memberof AWSXRay
   * @function
   * @returns {Segment|Subsegment}
   * @see module:context_utils.getSegment
   */

  getSegment: contextUtils.getSegment,

  /**
   * Sets the current segment or subsegment.  For use with automatic mode only.
   * @memberof AWSXRay
   * @function
   * @see module:context_utils.setSegment
   */

  setSegment: contextUtils.setSegment,

  /**
   * Returns true if automatic mode is enabled, otherwise false.
   * @memberof AWSXRay
   * @function
   * @see module:context_utils.isAutomaticMode
   */

  isAutomaticMode: contextUtils.isAutomaticMode,

  /**
   * Enables automatic mode. Automatic mode uses 'continuation-local-storage'.
   * @see https://github.com/othiym23/node-continuation-local-storage
   * @memberof AWSXRay
   * @function
   * @see module:context_utils.enableAutomaticMode
   */

  enableAutomaticMode: contextUtils.enableAutomaticMode,

  /**
   * Disables automatic mode. Current segment or subsegment must be passed manually
   * via the parent optional on captureFunc, captureAsyncFunc etc.
   * @memberof AWSXRay
   * @function
   * @see module:context_utils.enableManualMode
   */

  enableManualMode: contextUtils.enableManualMode,

  /**
   * Sets the context missing strategy.
   * @param {Object} strategy - The strategy to set. This object's contextMissing function will be called whenever trace context is not found.
   */

  setContextMissingStrategy: contextUtils.setContextMissingStrategy,


  /**
   * Exposes the segment class.
   * @memberof AWSXRay
   * @function
   */

  Segment: require('./segments/segment'),

  /**
   * Exposes the subsegment class.
   * @memberof AWSXRay
   * @see Subsegment
   */

  Subsegment: require('./segments/attributes/subsegment'),

  SegmentUtils: segmentUtils
};

/**
 * Exposes the IncomingRequestData, to capture incoming request data.
 * For use with middleware.
 * @memberof AWSXRay.middleware
 * @see IncomingRequestData
 */

AWSXRay.middleware.IncomingRequestData = require('./middleware/incoming_request_data'),

(function() {
  var data = {
    runtime: (process.release && process.release.name) ? process.release.name : UNKNOWN,
    runtime_version: process.version,
    version: process.env.npm_package_version || UNKNOWN,
    name: process.env.npm_package_name || UNKNOWN
  };

  var sdkData = {
    sdk: 'X-Ray for Node.js',
    sdk_version: (module.exports && module.exports.version) ? module.exports.version : UNKNOWN,
    package: (module.exports && module.exports.name) ? module.exports.name : UNKNOWN,
  };

  segmentUtils.setSDKData(sdkData);
  segmentUtils.setServiceData(data);

  if (process.env.LAMBDA_TASK_ROOT)
    LambdaEnv.init();
})();

module.exports = AWSXRay;
