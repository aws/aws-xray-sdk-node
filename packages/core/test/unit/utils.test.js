var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var TestUtils = require('./test_utils');
var Utils = require('../../lib/utils');

describe('Utils', function() {
  describe('#getCauseTypeFromHttpStatus', function() {
    it('should return "fault" on 5xx status code', function() {
      assert.equal(Utils.getCauseTypeFromHttpStatus(544), 'fault');
    });

    it('should return "error" on 4xx status code', function() {
      assert.equal(Utils.getCauseTypeFromHttpStatus(404), 'error');
    });
  });

  describe('#stripQueryStringFromPath', function() {
    it('should remove query string for simple path', function() {
      assert.equal(Utils.stripQueryStringFromPath('/index.html?page=12'), '/index.html');
    });

    it('should remove query string for complex path', function() {
      assert.equal(Utils.stripQueryStringFromPath('/really/long/path/to/content.html?page=12'), '/really/long/path/to/content.html');
    });
  });

  describe('#processTraceData', function() {
    it('should parse X-Amzn-Trace-Id with spaces', function() {
      var traceData = 'Root=1-58ed6027-14afb2e09172c337713486c0; Parent=48af77592b6dd73f; Sampled=1';

      var parsed = Utils.processTraceData(traceData);
      assert.propertyVal(parsed, 'Root', '1-58ed6027-14afb2e09172c337713486c0');
      assert.propertyVal(parsed, 'Parent', '48af77592b6dd73f');
      assert.propertyVal(parsed, 'Sampled', '1');
    });

    it('should parse X-Amzn-Trace-Id without spaces', function() {
      var traceData = 'Root=1-58ed6027-14afb2e09172c337713486c0;Parent=48af77592b6dd73f;Sampled=1';

      var parsed = Utils.processTraceData(traceData);
      assert.propertyVal(parsed, 'Root', '1-58ed6027-14afb2e09172c337713486c0');
      assert.propertyVal(parsed, 'Parent', '48af77592b6dd73f');
      assert.propertyVal(parsed, 'Sampled', '1');
    });

    it('should bail out for missing trace values', function() {
      assert.deepEqual(Utils.processTraceData(), {});
    });

    it('should bail out for empty trace values', function() {
      assert.deepEqual(Utils.processTraceData(''), {});
    });

    it('should handle trace header values with excess semicolons correctly', function() {
      assert.deepEqual(Utils.processTraceData('Root=1-58ed6027-14afb2e09172c337713486c0;'), {
        Root: '1-58ed6027-14afb2e09172c337713486c0'
      });
    });

    it('should handle malformed key=value pairs correctly (missing value)', function() {
      assert.deepEqual(Utils.processTraceData('Root=1-58ed6027-14afb2e09172c337713486c0;Parent'), {
        Root: '1-58ed6027-14afb2e09172c337713486c0'
      });
    });

    it('should handle malformed key=value pairs correctly (empty key)', function() {
      assert.deepEqual(Utils.processTraceData('Root=1-58ed6027-14afb2e09172c337713486c0;=48af77592b6dd73f'), {
        Root: '1-58ed6027-14afb2e09172c337713486c0'
      });
    });

    it('should handle malformed key=value pairs correctly (empty value)', function() {
      assert.deepEqual(Utils.processTraceData('Root=1-58ed6027-14afb2e09172c337713486c0;Parent='), {
        Root: '1-58ed6027-14afb2e09172c337713486c0'
      });
    });
  });

  describe('#processTraceData', function() {
    it('should call processTraceData', function() {
      assert.equal(Utils.getCauseTypeFromHttpStatus(544), 'fault');
    });

    it('should return "error" on 4xx status code', function() {
      assert.equal(Utils.getCauseTypeFromHttpStatus(404), 'error');
    });
  });

  describe('#LambdaUtils', function() {
    describe('#validTraceData', function() {
      var headerData, processStub, sandbox, xAmznTraceId;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        xAmznTraceId = 'moop';
        headerData = {
          Root: '1-58e8017e-fd7f0e6deaf6ce16a4841b44',
          Parent: 'c2f1d3ad6a9fbd5a',
          Sampled: '1'
        };

        processStub = sandbox.stub(Utils, 'processTraceData').returns(headerData);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should call processTraceData', function() {
        Utils.LambdaUtils.validTraceData(xAmznTraceId);
        processStub.should.have.been.calledWith(xAmznTraceId);
      });

      it('should return true if Root, Parent and Sampled are present', function() {
        assert.isTrue(Utils.LambdaUtils.validTraceData(headerData));
      });

      it('should return false any of Root, Parent and Sampled is missing', function() {
        delete headerData.Sampled;
        assert.isFalse(Utils.LambdaUtils.validTraceData(xAmznTraceId));
      });

      it('should return false if given no xAmznTraceId', function() {
        assert.isFalse(Utils.LambdaUtils.validTraceData());
      });
    });

    describe('#populateTraceData', function() {
      var headerData, processStub, sandbox, segment;
      var segmentId = 'b2f698e3dae16fb6';

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        segment = {};
        headerData = {
          Root: '1-58e8017e-fd7f0e6deaf6ce16a4841b44',
          Parent: 'c2f1d3ad6a9fbd5a',
          Sampled: '1'
        };

        processStub = sandbox.stub(Utils, 'processTraceData').returns(headerData);
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should call processTraceData', function() {
        Utils.LambdaUtils.populateTraceData(segment);
        processStub.should.have.been.calledOnce;
      });

      it('should return true if data is present', function() {
        var populated = Utils.LambdaUtils.populateTraceData(segment);
        assert.isTrue(populated);
      });

      it('should return false if data is missing', function() {
        delete headerData.Sampled;
        var populated = Utils.LambdaUtils.populateTraceData(segment);
        assert.isFalse(populated);
      });

      it('should set segment.trace_id', function() {
        Utils.LambdaUtils.populateTraceData(segment);
        assert.equal(segment.trace_id, headerData.Root);
      });

      it('should not set segment.notTraced', function() {
        Utils.LambdaUtils.populateTraceData(segment);
        assert.notProperty(segment, 'notTraced');
      });

      it('should set segment.notTraced as true if sampled is 0', function() {
        headerData.Sampled = '0';
        Utils.LambdaUtils.populateTraceData(segment);
        assert.propertyVal(segment, 'notTraced', true);
      });

      it('should delete segment.notTraced if sampled is 1', function() {
        headerData.Sampled = '1';
        Utils.LambdaUtils.populateTraceData(segment);
        assert.isUndefined(segment.notTraced);
      });

      it('should set the segment.id as the parent ID', function() {
        segment.id = segmentId;
        Utils.LambdaUtils.populateTraceData(segment);
        assert.propertyVal(segment, 'id', headerData.Parent);
      });
    });
  });

  describe('#wildcardMatch', function() {
    it('should match anything on "*"', function() {
      for (var i = 0; i < 10; i++)
        assert.equal(Utils.wildcardMatch('*', TestUtils.randomString(50)), true);
    });

    it('should match a single character on "?"', function() {
      assert.equal(Utils.wildcardMatch('?', 'a'), true);
    });

    it('should match on exact literals (case insensitive)', function() {
      assert.equal(Utils.wildcardMatch('foo', 'foo'), true);
      assert.equal(Utils.wildcardMatch('Foo', 'foo'), true);
      assert.equal(Utils.wildcardMatch('foo', 'Foo'), true);
    });

    it('should not match on unmatching exact literals', function() {
      assert.equal(Utils.wildcardMatch('GET', 'POST'), false);
    });

    it('should match any number of any characters on "*" and the rest of the pattern', function() {
      assert.equal(Utils.wildcardMatch('*.amazon.com', 'moop.amazon.com'), true);
      assert.equal(Utils.wildcardMatch('hello.*.com', 'hello.moop.com'), true);
      assert.equal(Utils.wildcardMatch('hello.amazon.*', 'hello.amazon.org'), true);
    });

    it('should not match on "*" if the rest of the pattern does not match', function() {
      assert.equal(Utils.wildcardMatch('*.amazon.com', 'moop.anazon.com'), false);
      assert.equal(Utils.wildcardMatch('*.amazon.com', 'moop.amazon.org'), false);
      assert.equal(Utils.wildcardMatch('amazon.*.com', 'anazon.moop.com'), false);
      assert.equal(Utils.wildcardMatch('amazon.*.com', 'amazon.noop.org'), false);
      assert.equal(Utils.wildcardMatch('moop.amazon.*', 'moop.anazon.com'), false);
      assert.equal(Utils.wildcardMatch('moop.amazon.*', 'noop.amazon.org'), false);
    });

    it('should match on multiple "*"s and the rest of the pattern', function() {
      assert.equal(Utils.wildcardMatch('**', TestUtils.randomString(6)), true);
      assert.equal(Utils.wildcardMatch('***', TestUtils.randomString(6)), true);
      assert.equal(Utils.wildcardMatch('*a*', TestUtils.randomString(6) + 'a' + TestUtils.randomString(3)), true);
      assert.equal(Utils.wildcardMatch('a*a*', 'a' + TestUtils.randomString(6) + 'a' + TestUtils.randomString(4)), true);
      assert.equal(Utils.wildcardMatch('*aaa*', '1aaa1'), true);
      assert.equal(Utils.wildcardMatch('*aaa*', TestUtils.randomString(6) + 'aaa' + TestUtils.randomString(5)), true);
      assert.equal(Utils.wildcardMatch('*.*.com', 'moop.amazon.com'), true);
      assert.equal(Utils.wildcardMatch('*moop.*.com', '1moop.amazon.com'), true);
      assert.equal(Utils.wildcardMatch('*moop.*.com', '111moop.amazon.com'), true);
    });

    it('should not match on multiple "*"s if the rest of the pattern does not match', function() {
      assert.equal(Utils.wildcardMatch('*.*.com', 'xray.amazon.org'), false);
      assert.equal(Utils.wildcardMatch('*.*moop.com', 'xray.amazon.com'), false);
      assert.equal(Utils.wildcardMatch('moop*.*moop.com', 'xraymoop.amazonmoop.com'), false);
      assert.equal(Utils.wildcardMatch('moop.moop*.*', 'moop.moppp.comcom'), false);
    });

    it('should match a single character on "?" and the rest of the pattern', function() {
      assert.equal(Utils.wildcardMatch('?b', 'ab'), true);
      assert.equal(Utils.wildcardMatch('b?', 'ba'), true);
      assert.equal(Utils.wildcardMatch('abc?', 'abca'), true);
      assert.equal(Utils.wildcardMatch('?abc', 'aabc'), true);
      assert.equal(Utils.wildcardMatch('ab?c', 'abac'), true);
      assert.equal(Utils.wildcardMatch('?ray.amazon.com', 'xray.amazon.com'), true);
      assert.equal(Utils.wildcardMatch('xray.amazon.?om', 'xray.amazon.xom'), true);
      assert.equal(Utils.wildcardMatch('xray.a?azon.com', 'xray.anazon.com'), true);
    });

    it('should not match on "?" if the rest of the pattern does not match', function() {
      assert.equal(Utils.wildcardMatch('?b', 'aa'), false);
      assert.equal(Utils.wildcardMatch('b?', 'aa'), false);
      assert.equal(Utils.wildcardMatch('abc?', 'abaa'), false);
      assert.equal(Utils.wildcardMatch('?abc', 'abbc'), false);
      assert.equal(Utils.wildcardMatch('ab?c', 'abab'), false);
      assert.equal(Utils.wildcardMatch('?ray.amazon.com', 'xray.anazon.com'), false);
      assert.equal(Utils.wildcardMatch('xray.amazon.?om', 'xray.amazon.xon'), false);
      assert.equal(Utils.wildcardMatch('xray.a?azon.com', 'xray.anazom.com'), false);
      assert.equal(Utils.wildcardMatch('?.moop.com', 'xray.amazon.com'), false);
    });

    it('should match on multiple "?"s and the rest of the pattern', function() {
      assert.equal(Utils.wildcardMatch('????.amazon.com', 'xray.amazon.com'), true);
      assert.equal(Utils.wildcardMatch('hell???mazon.com', 'hello.amazon.com'), true);
      assert.equal(Utils.wildcardMatch('hel?o??mazo??com', 'hello.amazon.com'), true);
    });

    it('should match on multiple "?"s spliced into the rest of pattern', function() {
      assert.equal(Utils.wildcardMatch('?abc?def?', '1abc2def3'), true);
    });

    it('should not match on multiple "?"s spliced in if the rest of the pattern does not match', function() {
      assert.equal(Utils.wildcardMatch('?abc?def?', '1def2ghi3'), false);
    });

    it('should not match on multiple "?"s if the rest of the pattern does not match', function() {
      assert.equal(Utils.wildcardMatch('????.amazom.com', 'x-ray.amazon.org'), false);
    });

    it('should match on complex cases when the pattern matches', function() {
      assert.equal(Utils.wildcardMatch('?a?b?c?.*.com', '1a2b3c4.myelasticbeanstalkenv.com'), true);
      assert.equal(Utils.wildcardMatch('?a?b*b?c?.*.com', '1a2bjkdwfjkewb3c4.myelasticbeanstalkenv.com'), true);
      assert.equal(Utils.wildcardMatch('1*?m', '1a2bjkdwfjkewb3c4.myelasticbeanstalkenv.com'), true);
    });

    it('should not match on complex cases when the interspliced literals do not match', function() {
      assert.equal(Utils.wildcardMatch('?a?b?c?.*.com', '1a2a3c4.myelasticbeanstalkenv.com'), false);
      assert.equal(Utils.wildcardMatch('?a?b?c?.*.com', '1a2a3c4.myelasticbeanstalkenv.com'), false);
      assert.equal(Utils.wildcardMatch('?a?b*b?c?.?*.com', '1a2bjkdwfjkewb3c4.myelasticbeanstalkenv.org'), false);
    });
  });
});
