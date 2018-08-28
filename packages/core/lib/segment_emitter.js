var dgram = require('dgram');

var batcher = require('atomic-batcher');
var logger = require('./logger');

var PROTOCOL_HEADER = '{"format":"json","version":1}';
var PROTOCOL_DELIMITER = '\n';

/**
 * Sends a collection of data over a UDP socket. This method
 * is designed to be used by `atomic-batcher` as a way to share
 * a single UDP socket for sending multiple data blocks.
 * 
 * @param {object} ops - Details of the data to send
 * @param {Function} callback - The function to call when done
 */
function batchSendData (ops, callback) {
  var client = dgram.createSocket('udp4');

  executeSendData(client, ops, 0, function () {
    try {
      client.close();
    } finally {
      callback();
    }
  });
}

/**
 * Execute sending data starting at the specified index and
 * using the provided client.
 *  
 * @param {Socket} client - Socket to send data with
 * @param {object} ops - Details of data to send
 * @param {number} index - Starting index for sending
 * @param {Function} callback - Function to call when done
 */
function executeSendData (client, ops, index, callback) {
  if (index >= ops.length) {
    callback();
    return;
  }

  sendMessage(client, ops[index], function () {
    executeSendData(client, ops, index+1, callback);
  });
}

/**
 * Send a single message over a UDP socket.
 * 
 * @param {Socket} client - Socket to send data with
 * @param {object} data - Details of the data to send
 * @param {Function} batchCallback - Function to call when done
 */
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

/**
 * Class to mimic the Socket interface for a UDP client, but to provided
 * batching of outgoing sends using temporary Sockets that are created and
 * destroyed as needed.
 */
function BatchingTemporarySocket() {
  this.batchSend = batcher(batchSendData);
}

/**
 * Provide the same signature as the Socket.send method but the work will be
 * batched to share temporary UDP sockets whenever possible.
 */
BatchingTemporarySocket.prototype.send = function (msg, offset, length, port, address, callback) {
  var work = {
    msg: msg,
    offset: offset,
    length: length,
    port: port,
    address: address,
    callback: callback
  };

  this.batchSend(work);
};

/**
 * Segment emitter module.
 * @module SegmentEmitter
 */

var SegmentEmitter = {
  socket: dgram.createSocket('udp4'),
  daemonConfig: require('./daemon_config'),

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

    client.send(message, 0, message.length, this.daemonConfig.udp_port, this.daemonConfig.udp_ip, function(err) {
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
   * @param {string} address - Address of the daemon the segments should be sent to. Should be formatted as an IPv4 address.
   * @module SegmentEmitter
   * @function setDaemonAddress
   */

  setDaemonAddress: function setDaemonAddress(address) {
    this.daemonConfig.setDaemonAddress(address)
  },

  /**
   * Get the UDP IP the emitter is configured to.
   * @module SegmentEmitter
   * @function getIp
   */

  getIp: function getIp() {
    return this.daemonConfig.udp_ip;
  },

  /**
   * Get the UDP port the emitter is configured to.
   * @module SegmentEmitter
   * @function getPort
   */

  getPort: function getPort() {
    return this.daemonConfig.udp_port;
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

if (SegmentEmitter.socket && (typeof SegmentEmitter.socket.unref === 'function'))
  SegmentEmitter.socket.unref();

module.exports = SegmentEmitter;
