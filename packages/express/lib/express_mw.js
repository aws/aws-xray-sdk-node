const AWSXRay = require('aws-xray-sdk-core');

const mwUtils = AWSXRay.middleware;

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
const expressMW = {

  /**
   * Use 'app.use(AWSXRayExpress.openSegment('defaultName'))' before defining your routes.
   * Use AWSXRay.getSegment() to access the current sub/segment.
   * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
   * @param {string} defaultName - The default name for the segment.
   * @alias module:express_mw.openSegment
   * @returns {function}
   */
  openSegment: (defaultName) => {
    if (!defaultName || typeof defaultName !== 'string') {
      throw new Error('Default segment name was not supplied.  Please provide a string.');
    }

    mwUtils.setDefaultName(defaultName);

    return (req, res, next) => {
      const segment = mwUtils.traceRequestResponseCycle(req, res);

      if (AWSXRay.isAutomaticMode()) {
        const ns = AWSXRay.getNamespace();
        ns.bindEmitter(req);
        ns.bindEmitter(res);

        ns.run(() => {
          AWSXRay.setSegment(segment);
          if (next) {
            next();
          }
        });
      } else {
        req.segment = segment;
        if (next) {
          next();
        }
      }
    };
  },

  /**
   * After your routes, before any extra error handling middleware, use 'app.use(AWSXRayExpress.closeSegment())'.
   * This is error-handling middleware, so it is called only when there is a server-side fault.
   * @alias module:express_mw.closeSegment
   * @returns {function}
   */
  closeSegment: () => {
    return (err, req, res, next) => {
      const segment = AWSXRay.resolveSegment(req.segment);

      if (segment && err) {
        segment.addError(err);
        AWSXRay.getLogger().debug('Added Express server fault to segment');
      }

      if (next) {
        next(err);
      }
    };
  }
};

module.exports = expressMW;
