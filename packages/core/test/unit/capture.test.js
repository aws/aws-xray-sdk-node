var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var contextUtils = require('../../lib/context_utils');
var Segment = require('../../lib/segments/segment');

var captureFunc = require('../../lib/capture').captureFunc;
var captureAsyncFunc = require('../../lib/capture').captureAsyncFunc;
var captureCallbackFunc = require('../../lib/capture').captureCallbackFunc;

chai.should();
chai.use(sinonChai);

describe('Capture', function() {
  var sandbox;

  var traceId = '1-57fbe041-2c7ad569f5d6ff149137be86';

  before(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(Segment.prototype, 'flush');
  });

  after(function() {
    sandbox.restore();
  });

  describe('when manual mode is enabled', function() {
    describe('#captureFunc', function() {
      var sandbox, segment;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        segment = new Segment('test', traceId);

        sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should create a subsegment on the parent', function() {
        const response = captureFunc('tracedFcn', function() {
          return 'OK';
        }, segment);

        assert.equal(response, 'OK');
        assert.property(segment, 'subsegments');
      });

      it('should close the subsegment on completion and record the time', function() {
        captureFunc('tracedFcn', function() {
          return;
        }, segment);

        assert.property(segment.subsegments[0], 'end_time');
        assert.isAtLeast(segment.subsegments[0].end_time, segment.subsegments[0].start_time);
      });

      it('should capture any errors thrown', function() {
        var err = new Error('x is not defined');

        assert.throws(function() {
          captureFunc('tracedFcn', function() {
            throw err;
          }, segment);
        });

        segment.close(err);
        assert.property(segment, 'fault');
        assert.equal(segment.cause.id, segment.subsegments[0].id);
        assert.equal(segment.subsegments[0].cause.exceptions[0].message, err.message);
      });

      it('should expose the new subsegment', function() {
        var subsegment;

        captureFunc('tracedFcn', function(sub) {
          subsegment = sub;
        }, segment);

        assert.isObject(subsegment);
        assert.equal(subsegment, segment.subsegments[0]);
      });
    });

    describe('#captureAsyncFunc', function() {
      var sandbox, segment;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        segment = new Segment('test', traceId);

        sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should create a subsegment on the parent', function(done) {
        const response = captureAsyncFunc('tracedFcn', function(seg) {
          seg.close();
          return 'OK';
        }, segment);

        setTimeout(function() {
          assert.equal(response, 'OK');
          assert.property(segment, 'subsegments');
          done();
        }, 50);
      });

      it('should record the time on close', function(done) {
        captureAsyncFunc('tracedFcn', function(seg) {
          seg.close();
        }, segment);

        setTimeout(function() {
          assert.property(segment.subsegments[0], 'end_time');
          assert.isAtLeast(segment.subsegments[0].end_time, segment.subsegments[0].start_time);
          done();
        }, 50);
      });

      it('should capture any errors thrown', function() {
        var err = new Error('x is not defined');

        assert.throws(function() {
          captureAsyncFunc('tracedFcn', function() {
            throw err;
          }, segment);
        });

        segment.close(err);
        assert.property(segment, 'fault');
        assert.equal(segment.cause.id, segment.subsegments[0].id);
        assert.equal(segment.subsegments[0].cause.exceptions[0].message, err.message);
      });

      it('should expose the new subsegment', function() {
        var subsegment;

        captureAsyncFunc('tracedFcn', function(sub) {
          subsegment = sub;
        }, segment);

        assert.isObject(subsegment);
        assert.equal(subsegment, segment.subsegments[0]);
      });
    });

    describe('#captureCallbackFunc', function() {
      var params, sandbox, segment;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        params = ['hello', 'there'];
        segment = new Segment('test', traceId);

        sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should call the original function and pass the params through', function() {
        var tracedFcn = function tracedFcn(callback) {
          callback(params[0], params[1]);
        };

        var callback = function tracedFcn(param0, param1) {
          assert.equal(params[0], param0);
          assert.equal(params[1], param1);
        };

        tracedFcn(captureCallbackFunc('callback', callback, segment));
      });
    });
  });

  describe('when automatic mode is enabled', function() {
    describe('#captureFunc', function() {
      var sandbox, segment;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        segment = new Segment('test', traceId);

        sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should create a subsegment on the parent', function() {
        const response = captureFunc('tracedFcn', function() {
          return 'OK';
        });

        assert.equal(response, 'OK');
        assert.property(segment, 'subsegments');
      });

      it('should close the subsegment on completion and record the time', function() {
        captureFunc('tracedFcn', function() {
          return;
        });

        assert.property(segment.subsegments[0], 'end_time');
        assert.isAtLeast(segment.subsegments[0].end_time, segment.subsegments[0].start_time);
      });

      it('should capture any errors thrown', function() {
        var err = new Error('x is not defined');

        assert.throws(function() {
          captureFunc('tracedFcn', function() {
            throw err;
          }, segment);
        });

        segment.close(err);
        assert.property(segment, 'fault');
        assert.equal(segment.cause.id, segment.subsegments[0].id);
        assert.equal(segment.subsegments[0].cause.exceptions[0].message, err.message);
      });

      it('should expose the new subsegment', function() {
        var subsegment;

        captureFunc('tracedFcn', function(sub) {
          subsegment = sub;
        });

        assert.isObject(subsegment);
        assert.equal(subsegment, segment.subsegments[0]);
      });
    });

    describe('#captureAsyncFunc', function() {
      var sandbox, segment;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        segment = new Segment('test', traceId);

        sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should create a subsegment on the parent', function(done) {
        const response = captureAsyncFunc('tracedFcn', function(seg) {
          seg.close();
          return 'OK';
        });

        setTimeout(function() {
          assert.equal(response, 'OK');
          assert.property(segment, 'subsegments');
          done();
        }, 50);
      });

      it('should record the time on close', function(done) {
        captureAsyncFunc('tracedFcn', function(seg) {
          seg.close();
        });

        setTimeout(function() {
          assert.property(segment.subsegments[0], 'end_time');
          assert.isAtLeast(segment.subsegments[0].end_time, segment.subsegments[0].start_time);
          done();
        }, 50);
      });

      it('should capture any errors thrown', function() {
        var err = new Error('x is not defined');

        assert.throws(function() {
          captureAsyncFunc('tracedFcn', function() {
            throw err;
          }, segment);
        });

        segment.close(err);
        assert.property(segment, 'fault');
        assert.equal(segment.cause.id, segment.subsegments[0].id);
        assert.equal(segment.subsegments[0].cause.exceptions[0].message, err.message);
      });

      it('should expose the new subsegment', function() {
        var subsegment;

        captureAsyncFunc('tracedFcn', function(sub) {
          subsegment = sub;
        }, segment);

        assert.isObject(subsegment);
        assert.equal(subsegment, segment.subsegments[0]);
      });
    });

    describe('#captureCallbackFunc', function() {
      var params, sandbox, segment;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        params = ['hello', 'there'];
        segment = new Segment('test', traceId);

        sandbox.stub(contextUtils, 'resolveSegment').returns(segment);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should call the original function and pass the params through', function() {
        var tracedFcn = function tracedFcn(callback) {
          callback(params[0], params[1]);
        };

        var callback = function tracedFcn(param0, param1) {
          assert.equal(params[0], param0);
          assert.equal(params[1], param1);
        };

        tracedFcn(captureCallbackFunc('callback', callback));
      });
    });
  });
});
