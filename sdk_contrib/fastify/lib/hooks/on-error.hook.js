const AWSXRay = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXRay;

/** @type {import('fastify').onErrorHookHandler} */
module.exports = function onErrorHook(request, reply, error, done) {
  const { segment } = request;

  if (segment) {
    segment.addError(error);
    mwUtils.middlewareLog(
      'Fastify XRay segment encountered an error',
      request.url,
      segment
    );
  }

  done();
};
