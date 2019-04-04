import AWS = require('aws-sdk');
import { Segment, captureAWSClient } from 'aws-xray-sdk-core';

const s3 = captureAWSClient(new AWS.S3());
const segment = new Segment('test');

async function main() {
  const result = await s3.listObjectsV2({
    Bucket: 'test',
    XRaySegment: segment,
  }).promise();

  // $ExpectType PromiseResult<ListObjectsV2Output, AWSError>
  result;
}

s3.listObjectsV2({ Bucket: 'test' }, (err, data) => {
  if (err) {
    err;  // $ExpectType AWSError
    console.error(err);
    return;
  }
  // $ExpectType ListObjectsV2Output
  data;
});
