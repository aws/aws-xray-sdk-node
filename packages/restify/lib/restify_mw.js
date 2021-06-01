/**
 * Enable X-Ray for Restify module.
 *
 * Exposes the 'enable' function to enable automated data capturing for a Restify web service. To enable on a Restify server,
 * use 'AWSXRayRestify.enable(<server>, <default segment name>)' before defining your routes.
 * Use AWSXRay.getSegment() to access the current sub/segment.
 * If in manual mode, this appends the Segment object to the request object as req.segment, or in the case of using
 * the Restify context plugin, it will be set as 'XRaySegment'.
 * @module restify_mw
 */

var AWSXRay = require('aws-xray-sdk-core');

var mwUtils = AWSXRay.middleware;

var restifyMW = {

  /**
   * Use 'AWSXRayRestify.enable(server, 'defaultName'))' before defining your routes.
   * Use AWSXRay.getSegment() to access the current sub/segment.
   * If in manual mode, this appends the Segment object to the request object as req.segment, or in the case of using
   * the Restify context plugin, it will be set as 'XRaySegment'.
   * @param {Server} server - The Restify server instance.
   * @param {string} defaultName - The default name for the segment.
   * @alias module:restify_mw.enable
   */

  enable: function enable(server, defaultName) {
    if (!server) {
      throw new Error('Restify server instance to enable was not supplied. Please provide a server.');
    }

    if (!defaultName || typeof defaultName !== 'string') {
      throw new Error('Default segment name was not supplied. Please provide a string.');
    }

    mwUtils.setDefaultName(defaultName);
    AWSXRay.getLogger().debug('Enabling AWS X-Ray for Restify.');

    var segment;

    server.use(function open(req, res, next) {
      segment = mwUtils.traceRequestResponseCycle(req, res);

      if (AWSXRay.isAutomaticMode()) {
        var ns = AWSXRay.getNamespace();
        ns.bindEmitter(req);
        ns.bindEmitter(res);

        ns.run(function() {
          AWSXRay.setSegment(segment);

          if (next) {
            next();
          }
        });
      } else {
        if (req.set) {
          req.set('XRaySegment', segment);
        } else {
          req.segment = segment;
        }

        if (next) {
          next();
        }
      }
    });

    server.on('uncaughtException', function uncaughtError(req, res, route, err) {
      if (segment && err) {
        segment.close(err);
      }
    });

    server.on('after', function handledError(req, res, route, err) {
      if (segment && err) {
        segment.addError(err);
      }
    });
  }
};

module.exports = restifyMW;
