const awsXray = require('aws-xray-sdk-core');
const hapiXray = require('../lib');

module.exports = {
  plugin: hapiXray,
  options: {
    segmentName: 'hapi-xray-sample',
    captureAWS: true,
    captureHTTP: true,
    capturePromises: true,
    plugins: [awsXray.plugins.ECSPlugin],
    logger: console,
  },
};
