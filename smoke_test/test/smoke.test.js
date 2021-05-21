const assert = require('chai').assert;
const AWSXRay = require('aws-xray-sdk');
const Segment = AWSXRay.Segment;

describe('Smoke Test', () => {
  it('Segment', () => {
    const segment = new Segment('test');
    assert.equal(segment.name, 'test');
  });
});
