var assert = require('chai').assert;
var TraceID = require('../../../../lib/segments/attributes/trace_id');

function validateTraceID(traceID) {
  const hexRegex = /^[0-9a-fA-F]+$/;
  assert.isNumber(traceID.version);
  assert.isTrue(hexRegex.test(traceID.timestamp));
  assert.isTrue(hexRegex.test(traceID.id));
}

describe('TraceID', function() {
  it('should construct a valid trace ID', function() {
    var traceId = new TraceID();
    validateTraceID(traceId);
  });

  it('should have created a valid trace ID from given string', function() {
    const traceStr = '1-57fbe041-2c7ad569f5d6ff149137be86';
    var traceId = TraceID.FromString(traceStr);
    assert.equal(traceId.version, 1);
    assert.equal(traceId.timestamp, '57fbe041');
    assert.equal(traceId.id, '2c7ad569f5d6ff149137be86');
  });

  it('should return a valid trace ID given undefined', function() {
    var traceId = TraceID.FromString(undefined);
    validateTraceID(traceId);
  });

  it('should return a valid trace ID when given malformed string', function() {
    const traceStr = 'FAKE-TRACE';
    var traceId = TraceID.FromString(traceStr);
    validateTraceID(traceId);
  });

  it('should return a valid trace ID when given partially malformed string', function() {
    const traceStr = '1-XYZ-2c7ad569f5d6ff149137be86';
    var traceId = TraceID.FromString(traceStr);
    validateTraceID(traceId);
  });

  it('should keep given trace ID the same between fromString and toString', function() {
    const traceStr = '1-57fbe041-2c7ad569f5d6ff149137be86';
    var traceId = TraceID.FromString(traceStr);
    assert.equal(traceId.toString(), traceStr);
  });
});
