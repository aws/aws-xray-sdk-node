const AWSXray = require('aws-xray-sdk-core');
const xray = require('./xray');

const xRayFastifyPlugin = (fastify, opts) => {
  xray(fastify, opts);

  const { middleware: mwUtils } = AWSXray;

  fastify.decorateRequest('segment', null);
  fastify.addHook('onRequest', async (request, reply, done) => {
    const req = request.raw;
    const res = reply.raw;

    const segment = mwUtils.traceRequestResponseCycle(req, res);

    if (!request.segment) {
      request.segment = segment;
    }

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
    }

    done();
  });
};

exports.xRayFastifyPlugin = xRayFastifyPlugin;

module.exports = xRayFastifyPlugin;
