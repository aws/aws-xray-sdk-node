const awsXray = require('aws-xray-sdk-core');

module.exports = {
  plugin: require('../lib'),
  options: {
    segmentName: 'fastify-xray-sample',
    captureAWS: true,
    captureHTTP: true,
    capturePromises: true,
    plugins: [awsXray.plugins.ECSPlugin],
    logger: console,
  },
};
