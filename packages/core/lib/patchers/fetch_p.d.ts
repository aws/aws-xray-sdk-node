import * as fetch from 'node-fetch';
import { Subsegment } from '../aws-xray';

// Need to have this here to get "clean" response from captureFetch since
// type file for node-fetch export both namespace and fetch function as default
export declare function fetchFunction(
  url: fetch.RequestInfo,
  init: fetch.RequestInit | undefined
): Promise<fetch.Response>;

type fetchSubsegmentCallback = (subsegment: Subsegment, req: fetch.Request, res: fetch.Response | null, error: Error) => void

export function captureFetch(downstreamXRayEnabled?: boolean, subsegmentCallback?: fetchSubsegmentCallback): typeof fetchFunction;
