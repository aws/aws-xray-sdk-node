'use strict';

const Hapi = require('@hapi/hapi');
const xrayPlugin = require('./xray-plugin');

const init = async () => {
  const server = Hapi.server({
    port: 3010,
    host: 'localhost',
  });

  server.route({
    method: 'GET',
    path: '/',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handler: (request, h) => {
      return 'Hello World!';
    },
  });

  await server.register(xrayPlugin);

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
