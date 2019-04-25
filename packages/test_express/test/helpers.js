var dgram = require('dgram');
var xray = require('aws-xray-sdk-core');
var xrayExpress = require('aws-xray-sdk-express');
var express = require('express');
var http = require('http');
var assert = require('chai').assert;

/**
 * @param {object} options 
 * @param {string} options.dynamicPattern
 * @param {Function} options.handler
 * @param {string} options.name
 * @param {string} options.route
 */
function createAppWithRoute(options) {
  var app = express();
  if (options.dynamicPattern) {
    xray.middleware.enableDynamicNaming(options.dynamicPattern);
  }
  app.use(xrayExpress.openSegment(options.name));
  app.use(options.route, options.handler);
  app.use(xrayExpress.closeSegment());
  return app;
}

function createDaemon() {
  return dgram.createSocket('udp4');
}

function messageCounter(expectedCount, callback) {
  var messages = [];
  return (message) => {
    messages.push(message);
    if (messages.length == expectedCount) {
      return callback(messages);
    } 
  }
}

/**
 * @param {string} url 
 */
function triggerEndpoint(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      var chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve({
          body: Buffer.concat(chunks).toString(),
          status: response.statusCode
        });
      });
    }).on('error', reject);
  });
}

function parseMessage(message) {
  message = message.toString();
  var parts = message.split('\n');
  assert.equal(parts.length, 2, 'Daemon message should contain a protocol and a segment document.');
  // parse the Segment document
  return JSON.parse(parts[1]);
}

module.exports = {
  createAppWithRoute: createAppWithRoute,
  createDaemon: createDaemon,
  messageCounter: messageCounter,
  parseMessage: parseMessage,
  triggerEndpoint: triggerEndpoint
};