var assert = require('chai').assert;
var chai = require('chai');
var sinonChai = require('sinon-chai');

import SqsMessageHelper from '../../../lib/env/sqs_message_helper';

chai.should();
chai.use(sinonChai);

describe('#SqsMessageHelper', function () {

  // sample records from https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
  const sampleSqsMessageEvent = {
    'Records': [
      {
        'messageId': '059f36b4-87a3-44ab-83d2-661975830a7d',
        'receiptHandle': 'AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...',
        'body': 'Test message.',
        'attributes': {
          'ApproximateReceiveCount': '1',
          'SentTimestamp': '1545082649183',
          'SenderId': 'AIDAIENQZJOLO23YVJ4VO',
          'ApproximateFirstReceiveTimestamp': '1545082649185',
          'AWSTraceHeader':'Root=1-632BB806-bd862e3fe1be46a994272793;Sampled=1'
        },
        'messageAttributes': {},
        'md5OfBody': 'e4e68fb7bd0e697a0ae8f1bb342846b3',
        'eventSource': 'aws:sqs',
        'eventSourceARN': 'arn:aws:sqs:us-east-2:123456789012:my-queue',
        'awsRegion': 'us-east-2'
      },
      {
        'messageId': '2e1424d4-f796-459a-8184-9c92662be6da',
        'receiptHandle': 'AQEBzWwaftRI0KuVm4tP+/7q1rGgNqicHq...',
        'body': 'Test message.',
        'attributes': {
          'ApproximateReceiveCount': '1',
          'SentTimestamp': '1545082650636',
          'SenderId': 'AIDAIENQZJOLO23YVJ4VO',
          'ApproximateFirstReceiveTimestamp': '1545082650649',
          'AWSTraceHeader':'Root=1-5759e988-bd862e3fe1be46a994272793;Parent=53995c3f42cd8ad8;Sampled=0'
        },
        'messageAttributes': {},
        'md5OfBody': 'e4e68fb7bd0e697a0ae8f1bb342846b3',
        'eventSource': 'aws:sqs',
        'eventSourceARN': 'arn:aws:sqs:us-east-2:123456789012:my-queue',
        'awsRegion': 'us-east-2'
      },
      {
        'messageId': '2e1424d4-f796-459a-8184-9c92662be6da',
        'receiptHandle': 'AQEBzWwaftRI0KuVm4tP+/7q1rGgNqicHq...',
        'body': 'Test message.',
        'attributes': {
          'ApproximateReceiveCount': '1',
          'SentTimestamp': '1545082650636',
          'SenderId': 'AIDAIENQZJOLO23YVJ4VO',
          'ApproximateFirstReceiveTimestamp': '1545082650649',
          'AWSTraceHeader':'Root=1-5759e988-bd862e3fe1be46a994272793;Parent=53995c3f42cd8ad8'
        },
        'messageAttributes': {},
        'md5OfBody': 'e4e68fb7bd0e697a0ae8f1bb342846b3',
        'eventSource': 'aws:sqs',
        'eventSourceARN': 'arn:aws:sqs:us-east-2:123456789012:my-queue',
        'awsRegion': 'us-east-2'
      }
    ]
  };

  describe('SqsMessageHelper isSampled', function() {

    it('should return true when AWSTraceHeader has Sampled=1', function() {
      assert.equal(SqsMessageHelper.isSampled(sampleSqsMessageEvent.Records[0]), true);
    });

    it('should return false when AWSTraceHeader has Sampled=0', function() {
      assert.equal(SqsMessageHelper.isSampled(sampleSqsMessageEvent.Records[1]), false);
    });

    it('should return false when AWSTraceHeader has no Sampled flag', function() {
      assert.equal(SqsMessageHelper.isSampled(sampleSqsMessageEvent.Records[2]), false);
    });

  });
});
