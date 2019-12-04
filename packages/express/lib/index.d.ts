import * as AWSXRay from 'aws-xray-sdk-core'

declare global {
  namespace Express {
    interface Request {
      segment?: AWSXRay.Segment;
    }
  }
}

export * from './express_mw';
