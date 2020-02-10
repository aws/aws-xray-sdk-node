/**
 * @module utils
 */

var logger = require('./logger');

var utils = {

  /**
   * Checks a HTTP response code, where 4xx are 'error' and 5xx are 'fault'.
   * @param {string} status - the HTTP response sattus code.
   * @returns [string] - 'error', 'fault' or nothing on no match
   * @alias module:utils.getCauseTypeFromHttpStatus
   */

  getCauseTypeFromHttpStatus: function getCauseTypeFromHttpStatus(status) {
    var stat = status.toString();
    if (stat.match(/^[4][0-9]{2}$/) !== null)
      return 'error';
    else if (stat.match(/^[5][0-9]{2}$/) !== null)
      return 'fault';
  },

  /**
   * Removes the query string parameters from a given http request path
   * as it may contain sensitive information
   * 
   * Related issue: https://github.com/aws/aws-xray-sdk-node/issues/246
   * 
   * Node documentation: https://nodejs.org/api/http.html#http_http_request_url_options_callback
   * 
   * @param {string} path - options.path in a http.request callback
   * @returns [string] - removes query string element from path
   * @alias module:utils.stripQueryStringFromPath
   */

  stripQueryStringFromPath: function stripQueryStringFromPath(path) {
    return path.split('?')[0];
  },

  /**
   * Performs a case-insensitive wildcard match against two strings. This method works with pseduo-regex chars; specifically ? and * are supported.
   *   An asterisk (*) represents any combination of characters
   *   A question mark (?) represents any single character
   *
   * @param {string} pattern - the regex-like pattern to be compared against.
   * @param {string} text - the string to compare against the pattern.
   * @returns boolean
   * @alias module:utils.wildcardMatch
   */

  wildcardMatch: function wildcardMatch(pattern, text) {
    if (pattern === undefined || text === undefined)
      return false;

    if (pattern.length === 1 && pattern.charAt(0) === '*')
      return true;

    var patternLength = pattern.length;
    var textLength = text.length;
    var indexOfGlob = pattern.indexOf('*');

    pattern = pattern.toLowerCase();
    text = text.toLowerCase();

    // Infix globs are relatively rare, and the below search is expensive especially when
    // Balsa is used a lot. Check for infix globs and, in their absence, do the simple thing
    if (indexOfGlob === -1 || indexOfGlob === (patternLength - 1)) {
      var match = function simpleWildcardMatch() {
        var j = 0;

        for(var i = 0; i < patternLength; i++) {
          var patternChar = pattern.charAt(i);
          if(patternChar === '*') {
            // Presumption for this method is that globs only occur at end
            return true;
          } else if (patternChar === '?') {
            if(j === textLength)
              return false; // No character to match

            j++;
          } else {
            if (j >= textLength || patternChar != text.charAt(j))
              return false;

            j++;
          }
        }
        // Ate up all the pattern and didn't end at a glob, so a match will have consumed all
        // the text
        return j === textLength;
      };

      return match();
    }

    /*
     * The matchArray[i] is used to record if there is a match between the first i chars in =
     * text and the first j chars in pattern.
     * So will return matchArray[textLength+1] in the end
     * Loop from the beginning of the pattern
     * case not '*': if text[i]==pattern[j] or pattern[j] is '?', and matchArray[i] is true,
     *   set matchArray[i+1] to true, otherwise false
     * case '*': since '*' can match any globing, as long as there is a true in matchArray before i
     *   all the matchArray[i+1], matchArray[i+2],...,matchArray[textLength] could be true
    */

    var matchArray = [];
    matchArray[0] = true;

    for (var j = 0; j < patternLength; j++) {
      var i;
      var patternChar = pattern.charAt(j);

      if (patternChar != '*') {
        for(i = textLength - 1; i >= 0; i--)
          matchArray[i+1] = !!matchArray[i] && (patternChar === '?' || (patternChar === text.charAt(i)));
      } else {
        i = 0;

        while (i <= textLength && !matchArray[i])
          i++;

        for(i; i <= textLength; i++)
          matchArray[i] = true;
      }
      matchArray[0] = (matchArray[0] && patternChar === '*');
    }

    return matchArray[textLength];
  },

  LambdaUtils: {
    validTraceData: function(xAmznTraceId) {
      var valid = false;

      if (xAmznTraceId) {
        var data = utils.processTraceData(xAmznTraceId);
        valid = !!(data && data.Root && data.Parent && data.Sampled);
      }

      return valid;
    },

    populateTraceData: function(segment, xAmznTraceId) {
      logger.getLogger().debug('Lambda trace data found: ' + xAmznTraceId);
      var data = utils.processTraceData(xAmznTraceId);
      var populated = false;

      if (data && data.Root && data.Parent && data.Sampled) {
        segment.trace_id = data.Root;
        segment.id = data.Parent;

        if (!parseInt(data.Sampled))
          segment.notTraced = true;
        else
          delete segment.notTraced;

        logger.getLogger().debug('Segment started: ' + JSON.stringify(data));

        populated = true;
      } else
        logger.getLogger().warn('_X_AMZN_TRACE_ID is missing required data.');

      return populated;
    }
  },

  /**
   * Splits out the data from the trace id format.  Used by the middleware.
   * @param {String} traceData - The additional trace data (typically in req.headers.x-amzn-trace-id).
   * @returns {object}
   * @alias module:mw_utils.processTraceData
   */

  processTraceData: function processTraceData(traceData) {
    var amznTraceData = {};

    if (!(typeof traceData === 'string' && traceData))
      return amznTraceData;

    traceData.split(';').forEach(function(header) {
      if (!header)
        return;

      var pair = header.split('=');

      if (pair[0] && pair[1])
        amznTraceData[pair[0].trim()] = pair[1].trim();
    });

    return amznTraceData;
  },

  /**
   * Makes a shallow copy of an object without given keys - keeps prototype
   * @param {Object} obj - The object to copy
   * @param {string[]} [keys=[]] - The keys that won't be copied
   * @param {boolean} [preservePrototype=false] - If true also copy prototype properties
   * @returns {}
   */

  objectWithoutProperties: function objectWithoutProperties(obj, keys, preservePrototype) {
    keys = Array.isArray(keys) ? keys : [];
    preservePrototype = typeof preservePrototype === 'boolean' ? preservePrototype : false;
    var target = preservePrototype ? Object.create(Object.getPrototypeOf(obj))  : {};
    for (var property in obj) {
      if (keys.indexOf(property) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, property)) continue;
      target[property] = obj[property];
    }
    return target;
  }
};

module.exports = utils;
