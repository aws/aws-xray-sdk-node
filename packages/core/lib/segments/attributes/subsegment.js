var _ = require('underscore');
var crypto = require('crypto');

var CapturedException = require('./captured_exception');
var RemoteRequestData = require('./remote_request_data');
var SegmentEmitter = require('../../segment_emitter');
var SegmentUtils = require('../segment_utils');

var logger = require('../../logger');

/**
 * Represents a subsegment.
 * @constructor
 * @param {string} name - The name of the subsegment.
 */

function Subsegment(name) {
  this.init(name);
}

Subsegment.prototype.init = function init(name) {
  if (typeof name != 'string')
    throw new Error('Subsegment name must be of type string.');

  this.id = crypto.randomBytes(8).toString('hex');
  this.name = name;
  this.start_time = SegmentUtils.getCurrentTime();
  this.in_progress = true;
  this.counter = 0;
};

/**
 * Nests a new subsegment to the array of subsegments.
 * @param {string} name - The name of the new subsegment to append.
 * @returns {Subsegment} - The newly created subsegment.
 */

Subsegment.prototype.addNewSubsegment = function addNewSubsegment(name) {
  var subsegment = new Subsegment(name);
  this.addSubsegment(subsegment);
  return subsegment;
};

/**
 * Adds a subsegment to the array of subsegments.
 * @param {Subsegment} subsegment - The subsegment to append.
 */

Subsegment.prototype.addSubsegment = function(subsegment) {
  if (!(subsegment instanceof Subsegment)) {
    throw new Error('Failed to add subsegment:' + subsegment + ' to subsegment "' + this.name +
      '".  Not a subsegment.');
  }

  if (_.isUndefined(this.subsegments))
    this.subsegments = [];

  subsegment.segment = this.segment;
  subsegment.parent = this;

  if (_.isUndefined(subsegment.end_time)) {
    this.incrementCounter(subsegment.counter);
  }

  this.subsegments.push(subsegment);
};

/**
 * Removes the subsegment from the subsegments array, used in subsegment streaming.
 */

Subsegment.prototype.removeSubsegment = function removeSubsegment(subsegment) {
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
 * Adds a property with associated data into the subsegment.
 * @param {string} name - The name of the property to add.
 * @param {Object} data - The data of the property to add.
 */

Subsegment.prototype.addAttribute = function addAttribute(name, data) {
  this[name] = data;
};

/**
 * Adds a subsegement id to record ordering.
 * @param {string} id - A subsegment id.
 */

Subsegment.prototype.addPrecursorId = function(id) {
  if (!_.isString(id))
    logger.getLogger().error('Failed to add id:' + id + ' to subsegment ' + this.name +
      '.  Precursor Ids must be of type string.');

  if (_.isUndefined(this.precursor_ids))
    this.precursor_ids = [];

  this.precursor_ids.push(id);
};

/**
 * Adds a key-value pair that can be queryable through GetTraceSummaries.
 * Only acceptable types are string, float/int and boolean.
 * @param {string} key - The name of key to add.
 * @param {boolean|string|number} value - The value to add for the given key.
 */

Subsegment.prototype.addAnnotation = function(key, value) {
  if (!(_.isBoolean(value) || _.isString(value) || _.isFinite(value))) {
    throw new Error('Failed to add annotation key: ' + key + ' value: ' + value + ' to subsegment ' +
      this.name + '. Value must be of type string, number or boolean.');
  } else if (!_.isString(key)) {
    throw new Error('Failed to add annotation key: ' + key + ' value: ' + value + ' to subsegment ' +
      this.name + '. Key must be of type string.');
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

Subsegment.prototype.addMetadata = function(key, value, namespace) {
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

Subsegment.prototype.addSqlData = function addSqlData(sqlData) {
  this.sql = sqlData;
};

/**
 * Adds an error with associated data into the subsegment.
 * To handle propagating errors, the subsegment also sets a copy of the error on the
 * root segment.  As the error passes up the execution stack, a reference is created
 * on each subsegment to the originating subsegment.
 * @param {Error|string} err - The error to capture.
 * @param {boolean} [remote] - Flag for whether the exception caught was remote or not.
 */

Subsegment.prototype.addError = function addError(err, remote) {
  if (!_.isObject(err) && typeof(err) !== 'string') {
    throw new Error('Failed to add error:' + err + ' to subsegment "' + this.name +
      '".  Not an object or string literal.');
  }

  this.addFaultFlag();

  if (this.segment && this.segment.exception) {
    if (err === this.segment.exception.ex) {
      this.fault = true;
      this.cause = { id: this.segment.exception.cause };
      return;
    }
    delete this.segment.exception;
  }

  if (this.segment) {
    this.segment.exception = {
      ex: err,
      cause: this.id
    };
  } else {
    //error, cannot propagate exception if not added to segment
  }

  if (_.isUndefined(this.cause)) {
    this.cause = {
      working_directory: process.cwd(),
      exceptions: []
    };
  }

  this.cause.exceptions.unshift(new CapturedException(err, remote));
};

/**
 * Adds data for an outgoing HTTP/HTTPS call.
 * @param {http.ClientRequest/https.ClientRequest} req - The request object from the HTTP/HTTPS call.
 * @param {http.IncomingMessage/https.IncomingMessage} res - The response object from the HTTP/HTTPS call.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced": true hint to generated subsegments such that the AWS X-Ray service expects a corresponding segment from the downstream service.
 */

Subsegment.prototype.addRemoteRequestData = function addRemoteRequestData(req, res, downstreamXRayEnabled) {
  this.http = new RemoteRequestData(req, res, downstreamXRayEnabled);
  if ('traced' in this.http.request) {
    this.traced = this.http.request.traced;
    delete this.http.request.traced;
  }
};

/**
 * Adds fault flag to the subsegment.
 */

Subsegment.prototype.addFaultFlag = function addFaultFlag() {
  this.fault = true;
};

/**
 * Adds error flag to the subsegment.
 */

Subsegment.prototype.addErrorFlag = function addErrorFlag() {
  this.error = true;
};

/**
 * Adds throttle flag to the subsegment.
 */

Subsegment.prototype.addThrottleFlag = function addThrottleFlag() {
  this.throttle = true;
};

/**
 * Closes the current subsegment.  This automatically captures any exceptions and sets the end time.
 * @param {Error|string} [err] - The error to capture.
 * @param {boolean} [remote] - Flag for whether the exception caught was remote or not.
 */

Subsegment.prototype.close = function close(err, remote) {
  var root = this.segment;
  this.end_time = SegmentUtils.getCurrentTime();
  delete this.in_progress;

  if (err)
    this.addError(err, remote);

  if (this.parent)
    this.parent.decrementCounter();

  if (root && root.counter > SegmentUtils.getStreamingThreshold()) {
    if (this.streamSubsegments() && this.parent)
      this.parent.removeSubsegment(this);
  }
};

/**
 * Each subsegment holds a counter of open subsegments.  This increments
 * the counter such that it can be called from a child and propagate up.
 * @param {Number} [additional] - An additional amount to increment.  Used when adding subsegment trees.
 */

Subsegment.prototype.incrementCounter = function incrementCounter(additional) {
  this.counter = additional ? this.counter + additional + 1 : this.counter + 1;

  if (this.parent)
    this.parent.incrementCounter(additional);
};

/**
 * Each subsegment holds a counter of its open subsegments.  This decrements
 * the counter such that it can be called from a child and propagate up.
 */

Subsegment.prototype.decrementCounter = function decrementCounter() {
  this.counter--;

  if (this.parent)
    this.parent.decrementCounter();
};

/**
 * Returns a boolean indicating whether or not the subsegment has been closed.
 * @returns {boolean} - Returns true if the subsegment is closed.
 */

Subsegment.prototype.isClosed = function isClosed() {
  return !this.in_progress;
};

/**
 * Sends the subsegment to the daemon.
 */

Subsegment.prototype.flush = function flush() {
  if (!this.parent || !this.segment) {
    throw new Error('Failed to flush subsegment: ' + this.name + '. Subsegment must be added ' +
      'to a segment chain to flush.');
  }

  if (this.segment.trace_id) {
    if (this.segment.notTraced !== true) {
      SegmentEmitter.send(this);
    } else {
      logger.getLogger().debug('Ignoring flush on subsegment ' + this.id + '. Associated segment is marked as not sampled.');
    }
  } else {
    logger.getLogger().debug('Ignoring flush on subsegment ' + this.id + '. Associated segment is missing a trace ID.');
  }
};

/**
 * Returns true if the subsegment was streamed in its entirety
 */

Subsegment.prototype.streamSubsegments = function streamSubsegments() {
  if (this.isClosed() && this.counter <= 0) {
    this.flush();
    return true;
  } else if (this.subsegments && this.subsegments.length > 0) {
    var open = [];

    this.subsegments.forEach(function(child) {
      if (!child.streamSubsegments())
        open.push(child);
    });

    this.subsegments = open;
  }
};

/**
 * Returns the formatted, trimmed subsegment JSON string to send to the daemon.
 */

Subsegment.prototype.format = function format() {
  this.type = 'subsegment';

  if (this.parent)
    this.parent_id = this.parent.id;

  if (this.segment)
    this.trace_id = this.segment.trace_id;

  return JSON.stringify(this);
};

/**
 * Returns the formatted subsegment JSON string.
 */

Subsegment.prototype.toString = function toString() {
  return JSON.stringify(this);
};

Subsegment.prototype.toJSON = function toJSON() {
  var ignore = ['segment', 'parent', 'counter'];

  if (_.isEmpty(this.subsegments))
    ignore.push('subsegments');

  return _.omit(this, ignore);
};

module.exports = Subsegment;
