import { Request, Response } from 'node-fetch';

declare module 'aws-xray-sdk-core' {
  interface Subsegment {
    /**
     * Extends Subsegment to append remote request data to subsegment, similar to what
     * Subsegment.prototype.addRemoteRequestData does in core/lib/segments/attributes/subsegment.js
     * @param {Fetch Request} request
     * @param {Fetch Request or null|undefined} response
     * @param {boolean} downstreamXRayEnabled
     */
    addFetchRequestData(
      request: Request,
      response: Response,
      downstreamXRayEnabled: boolean): void;
  }
}
