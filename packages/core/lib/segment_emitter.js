var dgram = require('dgram');

var batcher = require('atomic-batcher');
var logger = require('./logger');

var DEFAULT_ADDRESS = '127.0.0.1';
var DEFAULT_PORT = 2000;
var PROTOCOL_HEADER = '{"format": "json", "version": 1}';
var PROTOCOL_DELIMITER = '\n';

function batchRun (work, callback) {
  var client = dgram.createSocket('udp4');

  processWork(client, work, 0, function () {
    try {
      client.close();
    } finally {
      callback();
    }
  });
}

function processWork (client, work, index, callback) {
  if (index >= work.length) {
    callback();
    return;
  }

  sendMessage(client, work[index], function () {
    processWork(client, work, index+1, callback);
  });
}

function sendMessage (client, data, batchCallback) {
  var msg = data.msg;
  var offset = data.offset;
  var length = data.length;
  var port = data.port;
  var address = data.address;
  var callback = data.callback;

  client.send(msg, offset, length, port, address, function(err) {
    try {
      callback(err);
    } finally {
      batchCallback();
    }
  });
}

function BatchingTemporarySocket() {
  this.sendBatcher = batcher(batchRun);
}

BatchingTemporarySocket.prototype.send = function (msg, offset, length, port, address, callback) {
  var work = {
    msg: msg,
    offset: offset,
    length: length,
    port: port,
    address: address,
    callback: callback
  };

  this.sendBatcher(work);
};

/**
 * Segment emitter module.
 * @module SegmentEmitter
 */

var SegmentEmitter = {
  socket: dgram.createSocket('udp4'),
  daemonAddress: DEFAULT_ADDRESS,
  daemonPort: DEFAULT_PORT,

  /**
   * Returns the formatted segment JSON string.
   */

  format: function format(segment) {
    return PROTOCOL_HEADER + PROTOCOL_DELIMITER + segment.toString();
  },

  /**
   * Creates a UDP socket connection and send the formatted segment.
   * @param {Segment} segment - The segment to send to the daemon.
   */

  send: function send(segment) {
    var client = this.socket;
    var formatted = segment.format();
    var data = PROTOCOL_HEADER + PROTOCOL_DELIMITER + formatted;
    var message = new Buffer(data);

    var short = '{"trace_id:"' + segment.trace_id + '","id":"' + segment.id + '"}';
    var type = segment.type === 'subsegment' ? 'Subsegment' : 'Segment';

    client.send(message, 0, message.length, this.daemonPort, this.daemonAddress, function(err) {
      if (err) {
        if (err.code === 'EMSGSIZE')
          logger.getLogger().error(type + ' too large to send: ' + short + ' (' + message.length + ' bytes).');
        else
          logger.getLogger().error('Error occured sending segment: ', err);
      } else {
        logger.getLogger().debug(type + ' sent: {"trace_id:"' + segment.trace_id + '","id":"' + segment.id + '"}');
        logger.getLogger().debug('UDP message sent: ' + segment);
      }
    });
  },

  /**
   * Configures the address and/or port the daemon is expected to be on.
   * @param {string} address - Address of the daemon the segments should be sent to.  Should be formatted as an IPv4 address.
   * @module SegmentEmitter
   * @function setDaemonAddress
   */

  setDaemonAddress: function setDaemonAddress(address) {
    if (!process.env.AWS_XRAY_DAEMON_ADDRESS) {
      processAddress(address);
      logger.getLogger().info('Configured daemon address to ' + SegmentEmitter.daemonAddress + ':' + SegmentEmitter.daemonPort + '.');
    } else {
      logger.getLogger().warn('Ignoring call to setDaemonAddress as AWS_XRAY_DAEMON_ADDRESS is set. '+
        'The current daemon address will not be changed.');
    }
  },

  /**
   * Forces the segment emitter to create a new socket on send, and close it on complete.
   * @module SegmentEmitter
   * @function disableReusableSocket
   */

  disableReusableSocket: function() {
    this.socket = new BatchingTemporarySocket();
  }
};

var processAddress = function processAddress(rawAddress) {
  if (rawAddress.indexOf(':') === -1) {
    SegmentEmitter.daemonAddress = rawAddress;
  } else {
    var splitAddress = rawAddress.split(':');
    SegmentEmitter.daemonPort = parseInt(splitAddress[1]);

    if (splitAddress[0])
      SegmentEmitter.daemonAddress = splitAddress[0];
  }
};

if (process.env.AWS_XRAY_DAEMON_ADDRESS) {
  processAddress(process.env.AWS_XRAY_DAEMON_ADDRESS);
  logger.getLogger().info('AWS_XRAY_DAEMON_ADDRESS is set. Configured daemon address to ' + SegmentEmitter.daemonAddress +
    ':' + SegmentEmitter.daemonPort + '.');
}

if (SegmentEmitter.socket && (typeof SegmentEmitter.socket.unref === 'function'))
  SegmentEmitter.socket.unref();

module.exports = SegmentEmitter;
