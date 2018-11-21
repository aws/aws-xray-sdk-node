var assert = require('chai').assert;
var http = require('http');
var AWSXRay = require('../../');
var Segment = AWSXRay.Segment;

AWSXRay.enableAutomaticMode();

describe('Integration', function() {
  describe('#async', function() {
    it('should maintain segment in async functions', function(done) {
      var sharedPromise = null;

      var requestCount = 0;
      var server = http
        .createServer(function(req, res) {
          var ns = AWSXRay.getNamespace();
          ns.bindEmitter(req);
          ns.bindEmitter(res);

          ns.run(function () {
            var segment = new Segment('root');

            AWSXRay.setSegment(segment);

            if (!sharedPromise) {
              sharedPromise = Promise.resolve();
            }

            // execute an async task
            sharedPromise.then(async () => {

              await sleep(0);

              var retrievedSegment = AWSXRay.getSegment();
              res.end();

              // setTimeout so the assertion isn't caught by the promise
              setTimeout(function() {
                assert.equal(segment.id, retrievedSegment.id);
                if (++requestCount === 2){ 
                  done();
                }
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
    })
  });
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}