var assert = require('chai').assert;
var AWSXRay = require('aws-xray-sdk');
var Segment = AWSXRay.Segment;

describe('Smoke Test', function() {
	it('Segment', function() {
		var segment = new Segment('test');
        assert.equal(segment.name, 'test');
	});
});
