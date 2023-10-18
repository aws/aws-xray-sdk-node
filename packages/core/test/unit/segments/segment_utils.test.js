var assert = require('chai').assert;

var SegmentUtils = require('../../../lib/segments/segment_utils');

describe('SegmentUtils', function() {
  afterEach(function() {
    SegmentUtils.setStreamingThreshold(100);
  });

  describe('#setStreamingThreshold', function() {
    it('should override the default streaming threshold', function() {
      SegmentUtils.setStreamingThreshold(10);

      assert.equal(SegmentUtils.streamingThreshold, 10);
    });
  });

  describe('#getHttpResponseData', () => {
    it('should populate attributes as integers', () => {
      const responseWithStrings = {statusCode: '200', headers: {'content-length': '42'}};
      const res = SegmentUtils.getHttpResponseData(responseWithStrings);
      assert.deepEqual(res, {
        'content_length': 42,
        'status': 200
      });
    });

    it('should omit missing properties', () => {
      const responseWithStatus = {statusCode: 200};
      const responseWithLength = {headers: {'content-length': 42}};
      const emptyResponse = {};

      const statusRes = SegmentUtils.getHttpResponseData(responseWithStatus);
      const lengthRes = SegmentUtils.getHttpResponseData(responseWithLength);
      const emptyRes = SegmentUtils.getHttpResponseData(emptyResponse);

      assert.deepEqual(statusRes, {
        'status': 200
      });
      assert.deepEqual(lengthRes, {
        'content_length': 42
      });
      assert.deepEqual(emptyRes, {});
    });
  });

  describe('#getJsonStringifyReplacer', () => {
    it('should stringify BigInts', () => {
      const obj = {foo: 1n, bar: BigInt(2)};
      const replacer = SegmentUtils.getJsonStringifyReplacer();
      const result = JSON.stringify(obj, replacer);

      assert.equal(result, '{"foo":"1","bar":"2"}');
    });
  });
});
