// @ts-check
const configureAWSXRaySync = require('./private/configure-aws-x-ray-sync');
const onRequestHook = require('./hooks/on-request.hook');

/** @type {import('fastify').FastifyPluginAsync} */
const xRayFastifyPlugin = async (fastify, opts) => {
  configureAWSXRaySync(fastify, opts);

  fastify.decorateRequest('segment', null);
  fastify.addHook('onRequest', onRequestHook);
};

module.exports = xRayFastifyPlugin;
