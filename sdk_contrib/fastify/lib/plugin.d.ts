import * as AWSXRay from 'aws-xray-sdk-core';
import { FastityLoggerInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    segment?: AWSXRay.Segment;
  }
}

export interface XRayFastifyPluginOptions {
  segmentName?: string;
  captureAWS: boolean;
  captureHTTP: boolean;
  capturePromises: boolean;
  logger: FastityLoggerInstance;
  automaticMode: boolean;
  plugins: AWSXRay.plugins.Plugin[];
}

declare const xRayFastifyPlugin: FastifyPluginAsync<XRayFastifyPluginOptions>;

export default xRayFastifyPlugin;
