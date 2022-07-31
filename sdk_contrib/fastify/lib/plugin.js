// @ts-check
const AWSXRay = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXRay;

const xRayFastifyPlugin = async (fastify, opts) => {
  configureAWSXRaySync(fastify, opts);

  fastify.decorateRequest('segment', null);
  fastify.addHook('onRequest', async (request, reply) => {
    const req = request.raw;
    const res = reply.raw;

    const segment = mwUtils.traceRequestResponseCycle(req, res);

    if (!fastify.hasRequestDecorator('segment')) {
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
      });
    } else {
      fastify.log.info('Manual mode, skipping segment');
    }
  });
};

module.exports = xRayFastifyPlugin;

function configureAWSXRaySync(fastify, opts) {
  const defaultOptions = {
    automaticMode: true,
    logger: fastify.log,
  };

  const localOptions = { ...defaultOptions, ...opts };

  if (localOptions.logger) {
    AWSXRay.setLogger(localOptions.logger);
  } else {
    AWSXRay.setLogger(fastify.log);
  }

  const segmentName = localOptions.segmentName;

  if (!segmentName) {
    throw new Error('segmentName is required');
  }

  mwUtils.setDefaultName(segmentName);

  if (localOptions.automaticMode) {
    AWSXRay.enableAutomaticMode();
  } else {
    AWSXRay.enableManualMode();
  }

  if (localOptions.plugins) {
    AWSXRay.config(localOptions.plugins);
  }

  if (localOptions.captureAWS) {
    AWSXRay.captureAWS(require('aws-sdk'));
  }

  if (localOptions.captureHTTP) {
    AWSXRay.captureHTTPsGlobal(require('http'), true);
    AWSXRay.captureHTTPsGlobal(require('https'), true);
  }

  if (localOptions.capturePromises) {
    AWSXRay.capturePromise();
  }
}
