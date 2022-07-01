const AWSXray = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXray;

/**
 * Sets up the plugin for use
 */
module.exports = (fastify, options) => {
  const defaultOptions = {
    automaticMode: true,
    logger: fastify.log,
  };

  const localOptions = { ...defaultOptions, ...options };

  if (localOptions.logger) {
    AWSXray.setLogger(localOptions.logger);
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
};
