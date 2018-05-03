/* global Promise */

if (!global.Promise) {
  process.exit(0);
}

var assert = require('chai').assert;
var http = require('http');

var AWSXRay = require('../../');
var Segment = AWSXRay.Segment;

AWSXRay.capturePromise();
AWSXRay.enableAutomaticMode();

var sharedPromise = null;

var server = http
  .createServer(function(req, res) {
    var ns = AWSXRay.getNamespace();
    ns.bindEmitter(req);
    ns.bindEmitter(res);

    ns.run(function () {
      var segment = new Segment('foo');

      AWSXRay.setSegment(segment);

      if (!sharedPromise) {
        sharedPromise = Promise.resolve();
      }

      sharedPromise.then(function() {
        var retrievedSegment = AWSXRay.getSegment();
        res.end();

        // setTimeout so the assertion isn't caught by the promise
        setTimeout(function() {
          assert.equal(segment.id, retrievedSegment.id);
        });
      });
    });
  }).listen(8080, '0.0.0.0', function() {
    var address = server.address();

    var count = 0;
    function cb(err) {
      if (err) {
        throw err;
      }

      if (++count === 2) {
        server.close();
      }
    }
    sendRequest(address, cb);
    sendRequest(address, cb);
  });

function sendRequest(address, cb) {
  http
    .request({
      hostname: address.address,
      port: address.port,
      path: '/'
    })
    .on('response', function(res) {
      res.on('end', cb).resume();
    })
    .on('error', cb)
    .end();
}
