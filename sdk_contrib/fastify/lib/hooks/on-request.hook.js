// @ts-check
const AWSXRay = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXRay;

/** @type {import('fastify').onRequestHookHandler} */
module.exports = function onRequestHook(request, reply, done) {
  const req = request.raw;
  const res = reply.raw;

  const segment = mwUtils.traceRequestResponseCycle(req, res);

  if (AWSXRay.isAutomaticMode()) {
    const ns = AWSXRay.getNamespace();
    ns.bindEmitter(req);
    ns.bindEmitter(res);

    ns.run(() => {
      AWSXRay.setSegment(segment);
    });
  } else {
    request.log.info('Manual mode, skipping segment');

    if (!request.segment) {
      request.segment = segment;
    } else {
      request.log.warn('Request already has a segment, skipping');
    }
  }

  done();
};
