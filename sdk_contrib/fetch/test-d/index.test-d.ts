import * as AWSXRay from 'aws-xray-sdk-core/lib';
import { captureFetch, captureFetchGlobal, captureFetchModule } from '../lib/fetch_p';
import * as fetchModule from 'node-fetch';
import { expectType } from 'ts-expect';

type ModuleFetch = (url: URL | fetchModule.RequestInfo, init?: fetchModule.RequestInit | undefined) => Promise<fetchModule.Response>;

if (globalThis.fetch !== undefined) {
  function fetchGlobalCallback(subsegment: AWSXRay.Subsegment, req: Request, res: Response | null, error: Error) {
    console.log({ subsegment, req, res, error });
  }

  expectType<typeof globalThis.fetch>(captureFetchGlobal());
  expectType<typeof globalThis.fetch>(captureFetchGlobal(true));
  expectType<typeof globalThis.fetch>(captureFetchGlobal(false));
  expectType<typeof globalThis.fetch>(captureFetchGlobal(true, fetchGlobalCallback));
  expectType<typeof globalThis.fetch>(captureFetchGlobal(false, fetchGlobalCallback));


  expectType<typeof globalThis.fetch | ModuleFetch>(captureFetch());
  expectType<typeof globalThis.fetch | ModuleFetch>(captureFetch(true));
  expectType<typeof globalThis.fetch | ModuleFetch>(captureFetch(false));
  expectType<typeof globalThis.fetch | ModuleFetch>(captureFetch(true, fetchGlobalCallback));
  expectType<typeof globalThis.fetch | ModuleFetch>(captureFetch(false, fetchGlobalCallback));
}

function fetchModuleCallback(subsegment: AWSXRay.Subsegment, req: fetchModule.Request, res: fetchModule.Response | null, error: Error) {
  console.log({ subsegment, req, res, error });
}

expectType<ModuleFetch>(captureFetchModule(fetchModule));
expectType<ModuleFetch>(captureFetchModule(fetchModule, true));
expectType<ModuleFetch>(captureFetchModule(fetchModule, false));
expectType<ModuleFetch>(captureFetchModule(fetchModule, true, fetchModuleCallback));
expectType<ModuleFetch>(captureFetchModule(fetchModule, false, fetchModuleCallback));
