var crypto = require('crypto');
var _ = require('underscore');

var CapturedException = require('./attributes/captured_exception');
var SegmentEmitter = require('../segment_emitter');
var SegmentUtils = require('./segment_utils');
var Subsegment = require('./attributes/subsegment');

var logger = require('../logger');

/**
 * Represents a segment.
 * @constructor
 * @param {string} name - The name of the subsegment.
 * @param {string} [rootId] - The trace ID of the spawning parent, included in the 'X-Amzn-Trace-Id' header of the incoming request.  If one is not supplied, it will be generated.
 * @param {string} [parentId] - The sub/segment ID of the spawning parent, included in the 'X-Amzn-Trace-Id' header of the incoming request.
 */

function Segment(name, rootId, parentId) {
  this.init(name, rootId, parentId);
}

Segment.prototype.init = function init(name, rootId, parentId) {
  if (typeof name != 'string')
    throw new Error('Segment name must be of type string.');

  var traceId = rootId || '1-' + Math.round(new Date().getTime() / 1000).toString(16) + '-' +
    crypto.randomBytes(12).toString('hex');

  var id = crypto.randomBytes(8).toString('hex');
  var startTime = SegmentUtils.getCurrentTime();

  this.trace_id = traceId;
  this.id = id;
  this.start_time = startTime;
  this.name = name || '';
  this.in_progress = true;
  this.counter = 0;

  if (parentId)
    this.parent_id = parentId;

  if (SegmentUtils.serviceData)
    this.setServiceData(SegmentUtils.serviceData);

  if (SegmentUtils.pluginData)
    this.addPluginData(SegmentUtils.pluginData);

  if (SegmentUtils.origin)
    this.origin = SegmentUtils.origin;

  if (SegmentUtils.sdkData)
    this.setSDKData(SegmentUtils.sdkData);
};

/**
 * Adds incoming request data to the http block of the segment.
 * @param {IncomingRequestData} data - The data of the property to add.
 */

Segment.prototype.addIncomingRequestData = function addIncomingRequestData(data) {
  this.http = data;
};

/**
 * Adds a key-value pair that can be queryable through GetTraceSummaries.
 * Only acceptable types are string, float/int and boolean.
 * @param {string} key - The name of key to add.
 * @param {boolean|string|number} value - The value to add for the given key.
 */

Segment.prototype.addAnnotation = function addAnnotation(key, value) {
  if (!(_.isBoolean(value) || _.isString(value) || _.isFinite(value))) {
    logger.getLogger().error('Add annotation key: ' + key + ' value: ' + value + ' failed.' +
      ' Annotations must be of type string, number or boolean.');
    return;
  }

  if (_.isUndefined(this.annotations))
    this.annotations = {};

  this.annotations[key] = value;
};

/**
 * Adds a key-value pair to the metadata.default attribute when no namespace is given.
 * Metadata is not queryable, but is recorded.
 * @param {string} key - The name of the key to add.
 * @param {object|null} value - The value of the associated key.
 * @param {string} [namespace] - The property name to put the key/value pair under.
 */

Segment.prototype.addMetadata = function(key, value, namespace) {
  if (!_.isString(key)) {
    throw new Error('Failed to add annotation key: ' + key + ' value: ' + value + ' to subsegment ' +
      this.name + '. Key must be of type string.');
  } else if (namespace && !_.isString(namespace)) {
    throw new Error('Failed to add annotation key: ' + key + ' value: ' + value + 'namespace: ' + namespace + ' to subsegment ' +
      this.name + '. Namespace must be of type string.');
  }

  var ns = namespace || 'default';

  if (!this.metadata) {
    this.metadata = {};
  }

  if (!this.metadata[ns]) {
    this.metadata[ns] = {};
  }

  this.metadata[ns][key] = value;
};

/**
 * Adds data about the AWS X-Ray SDK onto the segment.
 * @param {Object} data - Object that contains the version of the SDK, and other information.
 */

Segment.prototype.setSDKData = function setSDKData(data) {
  if (!data) {
    logger.getLogger().error('Add SDK data: ' + data + ' failed.' +
      'Must not be empty.');
    return;
  }

  if (!this.aws)
    this.aws = {};

  this.aws.xray = data;
};

/**
 * Adds data about the service into the segment.
 * @param {Object} data - Object that contains the version of the application, and other information.
 */

Segment.prototype.setServiceData = function setServiceData(data) {
  if (!data) {
    logger.getLogger().error('Add service data: ' + data + ' failed.' +
      'Must not be empty.');
    return;
  }

  this.service = data;
};

/**
 * Adds a service with associated version data into the segment.
 * @param {Object} data - The associated AWS data.
 */

Segment.prototype.addPluginData = function addPluginData(data) {
  if (_.isUndefined(this.aws))
    this.aws = {};

  _.extend(this.aws, data);
};

/**
 * Adds a new subsegment to the array of subsegments.
 * @param {string} name - The name of the new subsegment to append.
 */

Segment.prototype.addNewSubsegment = function addNewSubsegment(name) {
  var subsegment = new Subsegment(name);
  this.addSubsegment(subsegment);
  return subsegment;
};

/**
 * Adds a subsegment to the array of subsegments.
 * @param {Subsegment} subsegment - The subsegment to append.
 */

Segment.prototype.addSubsegment = function addSubsegment(subsegment) {
  if (!(subsegment instanceof Subsegment))
    throw new Error('Cannot add subsegment: ' + subsegment + '. Not a subsegment.');

  if (_.isUndefined(this.subsegments))
    this.subsegments = [];

  subsegment.segment = this;
  subsegment.parent = this;
  this.subsegments.push(subsegment);

  if (!subsegment.end_time)
    this.incrementCounter(subsegment.counter);
};

/**
 * Removes the subsegment from the subsegments array, used in subsegment streaming.
 */

Segment.prototype.removeSubsegment = function removeSubsegment(subsegment) {
  if (!(subsegment instanceof Subsegment)) {
    throw new Error('Failed to remove subsegment:' + subsegment + ' from subsegment "' + this.name +
      '".  Not a subsegment.');
  }

  if (!_.isUndefined(this.subsegments)) {
    var index = this.subsegments.indexOf(subsegment);

    if (index >= 0)
      this.subsegments.splice(index, 1);
  }
};

/**
 * Adds error data into the segment.
 * @param {Error|string} err - The error to capture.
 * @param {boolean} [remote] - Flag for whether the exception caught was remote or not.
 */

Segment.prototype.addError = function addError(err, remote) {
  if (!_.isObject(err) && typeof(err) !== 'string') {
    throw new Error('Failed to add error:' + err + ' to subsegment "' + this.name +
      '".  Not an object or string literal.');
  }

  this.addFaultFlag();

  if (this.exception) {
    if (err === this.exception.ex) {
      this.cause = { id: this.exception.cause };
      delete this.exception;
      return;
    }
    delete this.exception;
  }

  if (_.isUndefined(this.cause)) {
    this.cause = {
      working_directory: process.cwd(),
      exceptions: []
    };
  }

  this.cause.exceptions.push(new CapturedException(err, remote));
};

/**
 * Adds fault flag to the subsegment.
 */

Segment.prototype.addFaultFlag = function addFaultFlag() {
  this.fault = true;
};

/**
 * Adds error flag to the subsegment.
 */

Segment.prototype.addErrorFlag = function addErrorFlag() {
  this.error = true;
};

/**
 * Adds throttle flag to the subsegment.
 */

Segment.prototype.addThrottleFlag = function addThrottleFlag() {
  this.throttle = true;
};

/**
 * Returns a boolean indicating whether or not the segment has been closed.
 * @returns {boolean} - Returns true if the subsegment is closed.
 */

Segment.prototype.isClosed = function isClosed() {
  return !this.in_progress;
};

/**
 * Each segment holds a counter of open subsegments.  This increments the counter.
 * @param {Number} [additional] - An additional amount to increment.  Used when adding subsegment trees.
 */

Segment.prototype.incrementCounter = function incrementCounter(additional) {
  this.counter = additional ? this.counter + additional + 1 : this.counter + 1;

  if (this.counter > SegmentUtils.streamingThreshold && this.subsegments && this.subsegments.length > 0) {
    var open = [];

    this.subsegments.forEach(function(child) {
      if (!child.streamSubsegments())
        open.push(child);
    });

    this.subsegments = open;
  }
};

/**
 * Each segment holds a counter of open subsegments.  This decrements
 * the counter such that it can be called from a child and propagate up.
 */

Segment.prototype.decrementCounter = function decrementCounter() {
  this.counter--;

  if (this.counter <= 0 && this.isClosed()) {
    this.flush();
  }
};

/**
 * Closes the current segment.  This automatically sets the end time.
 * @param {Error|string} [err] - The error to capture.
 * @param {boolean} [remote] - Flag for whether the exception caught was remote or not.
 */

Segment.prototype.close = function(err, remote) {
  if (!this.end_time)
    this.end_time = SegmentUtils.getCurrentTime();

  if (!_.isUndefined(err))
    this.addError(err, remote);

  delete this.in_progress;
  delete this.exception;

  if (this.counter <= 0) {
    this.flush();
  }
};

/**
 * Sends the segment to the daemon.
 */

Segment.prototype.flush = function flush() {
  if (this.notTraced !== true) {
    delete this.exception;
    SegmentEmitter.send(_.omit(this, ['counter', 'notTraced']));
  }
};

Segment.prototype.format = function format() {
  var ignore = ['counter', 'notTraced', 'exception'];

  if (_.isEmpty(this.subsegments))
    ignore.push('subsegments');

  var trimmed = _.omit(this, ignore);
  return JSON.stringify(trimmed);
};

Segment.prototype.toString = function toString() {
  return JSON.stringify(this);
};

module.exports = Segment;
