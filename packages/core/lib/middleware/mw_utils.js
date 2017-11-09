/**
 * Middleware Utils module.
 *
 * Exposes various configuration and helper methods to be used by the middleware.
 * @module mw_utils
 */

var SamplingRules = require('./sampling/sampling_rules');

var wildcardMatch = require('../utils').wildcardMatch;
var processTraceData = require('../utils').processTraceData;

//headers are case-insensitive
var XRAY_HEADER = 'x-amzn-trace-id';
var overrideFlag = !!process.env.AWS_XRAY_TRACING_NAME;

var utils = {
  defaultName: process.env.AWS_XRAY_TRACING_NAME,
  dynamicNaming: false,
  hostPattern: null,
  sampler: new SamplingRules(),

  /**
   * Enables dynamic naming for segments via the middleware. Use 'AWSXRay.middleware.enableDynamicNaming()'.
   * @param {string} [hostPattern] - The pattern to match the host header. See the README on dynamic and fixed naming modes.
   * @alias module:mw_utils.enableDynamicNaming
   */

  enableDynamicNaming: function(hostPattern) {
    this.dynamicNaming = true;

    if (hostPattern && typeof hostPattern !== 'string')
      throw new Error('Host pattern must be a string.');

    this.hostPattern = hostPattern || null;
  },

  /**
   * Splits out the 'x-amzn-trace-id' header params from the incoming request.  Used by the middleware.
   * @param {http.IncomingMessage|https.IncomingMessage} req - The request object from the incoming call.
   * @returns {object}
   * @alias module:mw_utils.processHeaders
   */

  processHeaders: function processHeaders(req) {
    var amznTraceHeader = {};

    if (req && req.headers && req.headers[XRAY_HEADER]) {
      amznTraceHeader = processTraceData(req.headers[XRAY_HEADER]);
    }

    return amznTraceHeader;
  },

  /**
   * Resolves the name of the segment as determined by fixed or dynamic mode options. Used by the middleware.
   * @param {string} hostHeader - The string from the request.headers.host property.
   * @returns {string}
   * @alias module:mw_utils.resolveName
   */

  resolveName: function resolveName(hostHeader) {
    var name;

    if (this.dynamicNaming && hostHeader)
      name = this.hostPattern ? (wildcardMatch(this.hostPattern, hostHeader) ? hostHeader : this.defaultName) : hostHeader;
    else
      name = this.defaultName;

    return name;
  },

  /**
   * Resolves the sampling decision as determined by the values given and options set. Used by the middleware.
   * @param {object} amznTraceHeader - The object as returned by the processHeaders function.
   * @param {Segment} segment - The string from the request.headers.host property.
   * @param {http.ServerResponse|https.ServerResponse} res - The response object from the incoming call.
   * @returns {boolean}
   * @alias module:mw_utils.resolveSampling
   */

  resolveSampling: function resolveSampling(amznTraceHeader, segment, res) {
    var isSampled;

    if (amznTraceHeader.Sampled === '1')
      isSampled = true;
    else if (amznTraceHeader.Sampled === '0')
      isSampled = false;
    else
      isSampled = this.sampler.shouldSample(res.req.headers.host, res.req.method, res.req.url);

    if (amznTraceHeader.Sampled === '?')
      res.header[XRAY_HEADER] = 'Root=' + amznTraceHeader.Root + ';Sampled=' + (isSampled ? '1' : '0');

    if (!isSampled)
      segment.notTraced = true;
  },

  /**
   * Sets the default name of created segments. Used with the middleware.
   * Can be overridden by the AWS_XRAY_TRACING_NAME environment variable.
   * @param {string} name - The default name for segments created in the middleware.
   * @alias module:mw_utils.setDefaultName
   */

  setDefaultName: function setDefaultName(name) {
    if (!overrideFlag)
      this.defaultName = name;
  },

  /**
   * Overrides the default sampling rules file to specify at what rate to sample at for specific routes.
   * The base sampling rules file can be found at /lib/resources/default_sampling_rules.json
   * @param {string|Object} source - The path to the custom sampling rules file, or the source JSON object.
   * @memberof AWSXRay
   */

  setSamplingRules: function setSamplingRules(source) {
    if (!source || source instanceof String || !(typeof source === 'string' || (source instanceof Object)))
      throw new Error('Please specify a path to the local sampling rules file, or supply an object containing the rules.');

    this.sampler = new SamplingRules(source);
  }
};

module.exports = utils;
