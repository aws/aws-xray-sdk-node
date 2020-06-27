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

var AWSXRay = require("aws-xray-sdk-core");

var mwUtils = AWSXRay.middleware;

/**
 * Use 'app.register(AWSXRayFastify({ defaultName: 'default' }))' before defining your routes.
 * Use AWSXRay.getSegment() to access the current sub/segment.
 * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
 * @param {{ defaultName: string }} options - The options to use.
 * @returns {function}
 */
module.exports = function ({ fastify, defaultName }) {
  if (!defaultName || typeof defaultName !== "string")
    throw new Error(
      "Default segment name was not supplied.  Please provide a string."
    );

  mwUtils.setDefaultName(defaultName);

  fastify.decorateRequest("segment", null);

  fastify.addHook("onRequest", (request, reply, done) => {
    var segment = mwUtils.traceRequestResponseCycle(request.raw, reply.res);

    if (AWSXRay.isAutomaticMode()) {
      var ns = AWSXRay.getNamespace();
      ns.bindEmitter(request.raw);
      ns.bindEmitter(reply.res);
      ns.run(function () {
        AWSXRay.setSegment(segment);

        done();
      });
    } else {
      request.segment = segment;
      done();
    }
  });

  fastify.addHook("onResponse", (request, reply, done) => {
    var segment = AWSXRay.resolveSegment(request.segment);

    segment.close();

    mwUtils.middlewareLog(
      "Closed express segment successfully",
      request.url,
      segment
    );

    done();
  });

  fastify.addHook("onError", (request, reply, error, done) => {
    var segment = AWSXRay.resolveSegment(request.segment);

    segment.close(error);

    mwUtils.middlewareLog(
      "Closed express segment with error",
      request.url,
      segment
    );

    done();
  });
};
