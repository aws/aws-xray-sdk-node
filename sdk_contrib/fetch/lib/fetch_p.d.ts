/* eslint-disable @typescript-eslint/no-unused-vars */
import { Subsegment } from 'aws-xray-sdk-core/lib/aws-xray';
import * as fetchModule from 'node-fetch';

type FetchModuleType = typeof fetchModule;

type fetchModuleFetch = (url: URL | fetchModule.RequestInfo, init?: fetchModule.RequestInit | undefined) => Promise<fetchModule.Response>;

export function captureFetchGlobal(
  downstreamXRayEnabled?: boolean,
  subsegmentCallback?: (subsegment: Subsegment, req: Request, res: Response | null, error: Error) => void):
  typeof globalThis.fetch;

export function captureFetchModule(
  fetch: FetchModuleType,
  downstreamXRayEnabled?: boolean,
  subsegmentCallback?: (subsegment: Subsegment, req: fetchModule.Request, res: fetchModule.Response | null, error: Error) => void):
  (url: URL | fetchModule.RequestInfo, init?: fetchModule.RequestInit | undefined) => Promise<fetchModule.Response>;

export function captureFetch(
  downstreamXRayEnabled?: boolean,
  subsegmentCallback?: (
      ((subsegment: Subsegment, req: Request, res: Response | null, error: Error) => void) |
      ((subsegment: Subsegment, req: fetchModule.Request, res: fetchModule.Response | null, error: Error) => void)
  )):
    (typeof globalThis.fetch) |
    ((url: URL | fetchModule.RequestInfo, init?: fetchModule.RequestInit | undefined) => Promise<fetchModule.Response>);
