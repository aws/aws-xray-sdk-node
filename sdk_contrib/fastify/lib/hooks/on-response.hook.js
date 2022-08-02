const AWSXRay = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXRay;

/** @type {import('fastify').onResponseHookHandler} */
module.exports = function onResponseHook(request, reply, done) {
  try {
    const { segment } = request;

    if (!segment || segment.isClosed()) {
      return done();
    }

    if (reply.statusCode >= 400) {
      if (reply.statusCode === 429) {
        segment.addThrottleFlag();
      }

      const cause = AWSXRay.utils.getCauseTypeFromHttpStatus(reply.statusCode);

      if (cause) {
        segment[cause] = true;
      }
    }

    if (segment.http) {
      segment.http.close(reply.raw);
    }

    segment.close();

    mwUtils.middlewareLog(
      'Closed Fastify XRay segment successfully',
      request.url,
      segment
    );

    done();
  } catch (error) {
    done(error);
  }
};
