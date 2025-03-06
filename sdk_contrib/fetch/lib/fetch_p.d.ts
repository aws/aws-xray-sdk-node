/* eslint-disable @typescript-eslint/no-unused-vars */
import AWSXRay from 'aws-xray-sdk-core';
import * as fetchModule from 'node-fetch';

type FetchModuleType = typeof fetchModule;

type fetchModuleFetch = (url: URL | fetchModule.RequestInfo, init?: fetchModule.RequestInit | undefined) => Promise<fetchModule.Response>;

export function captureFetchGlobal(
  downstreamXRayEnabled?: boolean,
  subsegmentCallback?: (subsegment: AWSXRay.Subsegment, req: Request, res: Response | null, error?: Error | undefined) => void):
  typeof globalThis.fetch;

export function captureFetchModule(
  fetch: FetchModuleType,
  downstreamXRayEnabled?: boolean,
  subsegmentCallback?: (subsegment: AWSXRay.Subsegment, req: fetchModule.Request, res: fetchModule.Response | null, error?: Error | undefined) => void):
  (url: URL | fetchModule.RequestInfo, init?: fetchModule.RequestInit | undefined) => Promise<fetchModule.Response>;

export function enableCapture<Fetch, Request>(
  fetch: Fetch,
  request: Request,
  downstreamXRayEnabled?: boolean,
  subsegmentCallback?: (subsegment: AWSXRay.Subsegment, req: Request, res: Response | null, error?: Error | undefined) => void
): Fetch;
