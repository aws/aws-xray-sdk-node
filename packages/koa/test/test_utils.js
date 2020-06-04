const EventEmitter = require('events');
const util = require('util');

const TestUtils = {};

TestUtils.TestEmitter = function TestEmitter() {
  EventEmitter.call(this);
};

util.inherits(TestUtils.TestEmitter, EventEmitter);

TestUtils.onEvent = function onEvent(event, fcn) {
  this.emitter.on(event, fcn.bind(this));
  return this;
};

module.exports = TestUtils;
