import * as http from 'http';
import * as https from 'https';
import { Subsegment } from '../aws-xray';

type httpSubsegmentCallback = (subsegment: Subsegment, req: http.ClientRequest, res: http.IncomingMessage | null, error: Error) => void

export function captureHTTPs<T extends typeof http | typeof https>(mod: T, downstreamXRayEnabled?: boolean, subsegmentCallback?: httpSubsegmentCallback): T;

export function captureHTTPsGlobal(mod: typeof https | typeof http, downstreamXRayEnabled?: boolean, subsegmentCallback?: httpSubsegmentCallback): void;
