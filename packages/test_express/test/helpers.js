var dgram = require('dgram');
var xray = require('aws-xray-sdk-core');
var xrayExpress = require('aws-xray-sdk-express');
var express = require('express');
require('cls-hooked'); // validates compat with continuation-local-storage
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

function jitter() {
    return 100 * Math.random();
}

function parseMessage(message) {
    message = message.toString();
    var parts = message.split('\n');
    assert.equal(parts.length, 2, 'Daemon message should contain a protocol and a segment document.');
    // parse the Segment document
    return JSON.parse(parts[1]);
}

/**
 * @param {number} ms 
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleepDedupe() {
    var inflightSleep = null;
    return () => {
        if (!inflightSleep) {
            inflightSleep = sleep(200);
            inflightSleep.then(() => {
                inflightSleep = null
            });
        }

        return inflightSleep;
    }
}

/**
 * @param {string} url 
 * @param {number} waitFor Amount of time to wait before making request in ms
 */
function triggerEndpoint(url, waitFor) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
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
        }, waitFor || 0);
    });
}

/**
 * 
 * @param {*} segment 
 * @param {object} expectedFields
 * @param {string} expectedFields.name Segment name
 * @param {number} expectedFields.responseStatus Express response status code
 * @param {string} expectedFields.url Express route url
 */
function validateExpressSegment(segment, expectedFields) {
    assert.equal(segment.name, expectedFields.name);
    assert.isNumber(segment.end_time);
    assert.isNumber(segment.start_time);
    assert.equal(segment.http.request.method, 'GET');
    assert.isString(segment.http.request.client_ip);
    assert.equal(segment.http.request.url, expectedFields.url);
    assert.equal(segment.http.response.status, expectedFields.responseStatus);
    assert.isString(segment.trace_id);
}

module.exports = {
    createAppWithRoute: createAppWithRoute,
    createDaemon: createDaemon,
    jitter: jitter,
    messageCounter: messageCounter,
    parseMessage: parseMessage,
    sleep: sleep,
    sleepDedupe: sleepDedupe,
    triggerEndpoint: triggerEndpoint,
    validateExpressSegment: validateExpressSegment
};