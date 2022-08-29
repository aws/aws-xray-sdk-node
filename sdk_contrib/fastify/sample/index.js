'use strict';

const Fastify = require('fastify');
const xrayPlugin = require('./xray-plugin');

const server = Fastify();

server.register(xrayPlugin.plugin, xrayPlugin.options);
server.route({
  method: 'GET',
  path: '/',
  handler: async (_request, _reply) => {
    return 'Hello World!';
  },
});

server
  .listen(3000)
  .then(() => {
    console.log(`server listening on port 3000`);
  })
  .catch(console.error);
