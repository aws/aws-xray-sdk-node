import * as AWSXRay from 'aws-xray-sdk-core';

declare module 'restify' {
  interface Request {
    segment?: AWSXRay.Segment;
  }
}

export * from './restify_mw';
