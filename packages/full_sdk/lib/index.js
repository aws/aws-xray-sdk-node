// Convenience file to require the SDK from the root of the repository
var AWSXRay = require('aws-xray-sdk-core');
AWSXRay.express = require('aws-xray-sdk-express');
AWSXRay.captureMySQL = require('aws-xray-sdk-mysql');
AWSXRay.capturePostgres = require('aws-xray-sdk-postgres');

// Import Data from package.json,
// If the importing of package.json fails leave
// pkginfo as an empty object
var pkginfo = {};
try {
  pkginfo = require('../package.json');
} catch (err) {
  AWSXRay.getLogger().debug('Failed to load SDK data:', err);
}

var UNKNOWN = 'unknown';

(function () {
  var sdkData = AWSXRay.SegmentUtils.sdkData || { sdk: 'X-Ray for Node.js' };
  sdkData.sdk_version = pkginfo.version ? pkginfo.version : UNKNOWN;
  sdkData.package = pkginfo.name ? pkginfo.name : UNKNOWN;
  AWSXRay.SegmentUtils.setSDKData(sdkData);
})();

module.exports = AWSXRay;
