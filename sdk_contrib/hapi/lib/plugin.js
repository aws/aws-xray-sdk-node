const xray = require('./xray');

/**
 *
 * @param {Server} server
 * @param options Options for the plugin setup
 * @param {String} [options.segmentName] Segment name to use in place of default segment name generator
 * @param {Boolean} [options.captureAWS] Specifies that AWS calls should be captured. Requires aws-sdk package.
 * @param {Boolean} [options.captureHTTP] Specifies that downstream http calls should be captured by default.
 * @param {Boolean} [options.capturePromises] Specifies that downstream promises should be captured.
 * @param {Object} [options.logger] Logger to pass to xray
 * @param {Boolean} [options.automaticMode] Puts xray into automatic or manual mode. Default is true (automatic)
 * @param {Object[]} [options.plugins] Array of AWS plugins to pass to xray
 */
module.exports = {
  register: (server, options) => {
    xray.setup(options);

    server.ext({
      type: 'onRequest',
      method: xray.handleRequest
    });

    server.events.on(
      { name: 'request', channels: 'error' },
      (request, event) => {
        xray.handleError(request, event.error);
      }
    );

    server.events.on('response', xray.handleResponse);
  }
};
