var EventEmitter = require('events');
var util = require('util');

var TestUtils = {};

TestUtils.TestEmitter = function TestEmitter() {
  EventEmitter.call(this);
};

util.inherits(TestUtils.TestEmitter, EventEmitter);

TestUtils.onEvent = function onEvent(event, fcn) {
  this.emitter.on(event, fcn.bind(this));
  return this;
};

TestUtils.randomString = function randomString(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.#-_$%^&@!';
  for(var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

module.exports = TestUtils;
