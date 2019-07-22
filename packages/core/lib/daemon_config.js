var logger = require('./logger');

/**
 * A module representing the X-Ray daemon configuration including the udp and tcp addresses.
 * @module DaemonConfig
 */
var DaemonConfig = {
  udp_ip: '127.0.0.1',
  udp_port: 2000,
  tcp_ip: '127.0.0.1',
  tcp_port: 2000,

  setDaemonAddress: function setDaemonAddress(address) {
    if(!process.env.AWS_XRAY_DAEMON_ADDRESS) {
      processAddress(address);
      logger.getLogger().info('Configured daemon address to ' + address + '.');
    } else {
      logger.getLogger().warn('Ignoring call to setDaemonAddress as AWS_XRAY_DAEMON_ADDRESS is set. '+
        'The current daemon address will not be changed.');
    }
  }
};

var processAddress = function processAddress(address) {
  if(address.indexOf(':') === -1) {
    throw new Error('Invalid Daemon Address. You must specify an ip and port.');
  } else {
    var splitAddress = address.split(' ');
    if (splitAddress.length === 1) {
      // in format of 127.0.0.1:2000
      if(address.indexOf('udp') > -1 || address.indexOf('tcp') > -1) {
        throw new Error('Invalid Daemon Address. You must specify both tcp and udp addresses.');
      }
      var addr = address.split(':');
      if(!addr[0]) throw new Error('Invalid Daemon Address. You must specify an ip.');
      DaemonConfig.udp_ip = addr[0];
      DaemonConfig.tcp_ip = addr[0];
      DaemonConfig.udp_port = addr[1];
      DaemonConfig.tcp_port = addr[1];
    }
    else if(splitAddress.length === 2) {
      // in format of udp:127.0.0.1:2000 tcp:127.0.0.1:2001
      var part_1 = splitAddress[0].split(':');
      var part_2 = splitAddress[1].split(':');
      var addr_map = {};
      addr_map[part_1[0]] = part_1;
      addr_map[part_2[0]] = part_2;

      DaemonConfig.udp_ip = addr_map['udp'][1];
      DaemonConfig.udp_port = parseInt(addr_map['udp'][2]);
      DaemonConfig.tcp_ip = addr_map['tcp'][1];
      DaemonConfig.tcp_port = parseInt(addr_map['tcp'][2]);

      if(!DaemonConfig.udp_port || !DaemonConfig.tcp_port) {
        throw new Error('Invalid Daemon Address. You must specify port number.');
      }
    }
  }
};

if(process.env.AWS_XRAY_DAEMON_ADDRESS)
  processAddress(process.env.AWS_XRAY_DAEMON_ADDRESS);
module.exports = DaemonConfig;
