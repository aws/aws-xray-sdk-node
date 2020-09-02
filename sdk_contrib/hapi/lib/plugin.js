const xray = require('./xray');

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
