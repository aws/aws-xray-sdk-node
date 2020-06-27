/**
 * Fastify hooks.
 *
 * Hooks into a provided fastify instance to enable automated data capturing on a web service. To enable on a Node.js/Fastify application,
 * use 'AWSXRayFastify.capture({ fastify: app, defaultName: 'default' })'.
 * Use AWSXRay.getSegment() to access the current sub/segment.
 * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
 * @module fastify_plugin
 */

var AWSXRay = require("aws-xray-sdk-core");

var mwUtils = AWSXRay.middleware;

/**
 * Use 'AWSXRayFastify.capture({ fastify: app, defaultName: 'default' })' before defining your routes.
 * Use AWSXRay.getSegment() to access the current sub/segment.
 * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
 * @param {{ defaultName: string }} options - The options to use.
 * @returns {function}
 */
module.exports = {
  capture: function capture({ fastify, defaultName }) {
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
        "Closed fastify segment successfully",
        request.url,
        segment
      );

      done();
    });

    fastify.addHook("onError", (request, reply, error, done) => {
      var segment = AWSXRay.resolveSegment(request.segment);

      segment.close(error);

      mwUtils.middlewareLog(
        "Closed fastify segment with error",
        request.url,
        segment
      );

      done();
    });
  },
};
