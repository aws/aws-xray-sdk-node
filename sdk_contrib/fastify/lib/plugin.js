const AWSXray = require('aws-xray-sdk-core');

const xRayFastifyPlugin = (fastify, opts) => {
  const defaultOptions = {
    automaticMode: true,
    logger: fastify.log,
  };

  const localOptions = { ...defaultOptions, ...opts };

  if (localOptions.logger) {
    AWSXray.setLogger(localOptions.logger);
  } else {
    AWSXray.setLogger(fastify.log);
  }

  const segmentName =
    localOptions.segmentName || exports._internals.createSegmentName();
  mwUtils.setDefaultName(segmentName);

  if (localOptions.automaticMode) {
    AWSXray.enableAutomaticMode();
  } else {
    AWSXray.enableManualMode();
  }

  if (localOptions.plugins) {
    AWSXray.config(localOptions.plugins);
  }

  if (localOptions.captureAWS) {
    AWSXray.captureAWS(require('aws-sdk'));
  }

  if (localOptions.captureHTTP) {
    AWSXray.captureHTTPsGlobal(require('http'), true);
    AWSXray.captureHTTPsGlobal(require('https'), true);
  }

  if (localOptions.capturePromises) {
    AWSXray.capturePromise();
  }

  const { middleware: mwUtils } = AWSXray;

  fastify.decorateRequest('segment', null);
  fastify.addHook('onRequest', async (request, reply, done) => {
    const req = request.raw;
    const res = reply.raw;

    const segment = mwUtils.traceRequestResponseCycle(req, res);

    if (!request.segment) {
      request.segment = segment;
    } else {
      fastify.log.warn('Request already has a segment, skipping');
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
    } else {
      fastity.log.info('Manual mode, skipping segment');
    }

    done();
  });
};

exports.xRayFastifyPlugin = xRayFastifyPlugin;

module.exports = xRayFastifyPlugin;
