/**
 * Express middleware module.
 *
 * Exposes Express middleware functions to enable automated data capturing on a web service. To enable on a Node.js/Express application,
 * use 'app.use(AWSXRayExpress.openSegment())' before defining your routes.  After your routes, before any extra error
 * handling middleware, use 'app.use(AWSXRayExpress.closeSegment())'.
 * Use AWSXRay.getSegment() to access the current sub/segment.
 * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
 * @module express_mw
 */

var AWSXRay = require('aws-xray-sdk-core');

var mwUtils = AWSXRay.middleware;

var expressMW = {

  /**
   * Use 'app.use(AWSXRayExpress.openSegment('defaultName'))' before defining your routes.
   * Use AWSXRay.getSegment() to access the current sub/segment.
   * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
   * @param {string} defaultName - The default name for the segment.
   * @alias module:express_mw.openSegment
   * @returns {function}
   */

  openSegment: function openSegment(defaultName) {
    if (!defaultName || typeof defaultName !== 'string')
      throw new Error('Default segment name was not supplied.  Please provide a string.');

    mwUtils.setDefaultName(defaultName);

    return function (req, res, next) {
      var segment = mwUtils.traceRequestResponseCycle(req, res);

      if (AWSXRay.isAutomaticMode()) {
        var ns = AWSXRay.getNamespace();
        ns.bindEmitter(req);
        ns.bindEmitter(res);

        ns.run(function () {
          AWSXRay.setSegment(segment);

          if (next) { next(); }
        });
      } else {
        req.segment = segment;
        if (next) { next(); }
      }
    };
  },

  /**
   * After your routes, before any extra error handling middleware, use 'app.use(AWSXRayExpress.closeSegment())'.
   * @alias module:express_mw.closeSegment
   * @returns {function}
   */

  closeSegment: function closeSegment() {
    return function close(err, req, res, next) {
      var segment = AWSXRay.resolveSegment(req.segment);

      if (segment && err) {
        segment.close(err);

        mwUtils.middlewareLog('Closed express segment with error', req.url, segment);

      } else if (segment) {
        segment.close();

        mwUtils.middlewareLog('Closed express segment successfully', req.url, segment);
      }

      if (next)
        next(err);
    };
  }
};

module.exports = expressMW;
