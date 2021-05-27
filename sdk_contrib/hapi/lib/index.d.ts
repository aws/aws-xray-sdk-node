import * as AWSXRay from 'aws-xray-sdk-core';

declare global {
  namespace Hapi {
    interface Request {
      segment?: AWSXRay.Segment;
    }
  }
}

export * from './index';
