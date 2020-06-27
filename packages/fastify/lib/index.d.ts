import * as AWSXRay from 'aws-xray-sdk-core'

declare module 'fastify' {
  interface FastifyRequest {
    segment?: AWSXRay.Segment;
  }
}

export * from './fastify_plugin';
