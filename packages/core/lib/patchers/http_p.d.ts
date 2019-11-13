import * as http from 'http';
import * as https from 'https';

export function captureHTTPs<T extends typeof http | typeof https>(mod: T, downstreamXRayEnabled: boolean): T;

export function captureHTTPsGlobal(mod: typeof https | typeof http, downstreamXRayEnabled: boolean): void;
