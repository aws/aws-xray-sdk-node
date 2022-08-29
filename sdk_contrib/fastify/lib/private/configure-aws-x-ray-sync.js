// @ts-check
const AWSXRay = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXRay;

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} opts
 */
module.exports = function configureAWSXRaySync(fastify, opts) {
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
};
