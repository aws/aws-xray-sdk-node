import * as AWSXRay from 'aws-xray-sdk-core';

declare global {
  namespace Koa {
    interface Request {
      segment?: AWSXRay.Segment;
    }
  }
}

export * from './koa_mw';
