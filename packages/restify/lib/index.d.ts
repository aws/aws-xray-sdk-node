import * as AWSXRay from 'aws-xray-sdk-core';
import { Request } from 'restify';

declare module 'restify' {
  interface Request {
    segment?: AWSXRay.Segment;
  }
}

export * from './restify_mw';
