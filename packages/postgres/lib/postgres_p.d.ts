import * as AWSXRay from 'aws-xray-sdk-core';
import * as PG from 'pg';

declare function capturePostgres(pg: typeof PG): capturePostgres.PatchedPostgres;

declare namespace capturePostgres {
  interface CaptureQueryMethod {
    <T extends PG.Submittable>(queryStream: T, segment?: AWSXRay.SegmentLike): T;

    <R extends any[] = any[], I extends any[] = any[]>(
      queryConfig: PG.QueryArrayConfig<I>,
      values?: I,
      segment?: AWSXRay.SegmentLike
    ): Promise<PG.QueryArrayResult<R>>;

    <R extends PG.QueryResultRow = any, I extends any[] = any[]>(
      queryConfig: PG.QueryConfig<I>,
      segment?: AWSXRay.SegmentLike
    ): Promise<PG.QueryResult<R>>;

    <R extends PG.QueryResultRow = any, I extends any[] = any[]>(
      queryTextOrConfig: string | PG.QueryConfig<I>,
      values?: I,
      segment?: AWSXRay.SegmentLike
    ): Promise<PG.QueryResult<R>>;

    <R extends any[] = any[], I extends any[] = any[]>(
      queryConfig: PG.QueryArrayConfig<I>,
      callback: (err: Error, result: PG.QueryArrayResult<R>) => void,
      segment?: AWSXRay.SegmentLike
    ): void;

    <R extends PG.QueryResultRow = any, I extends any[] = any[]>(
      queryTextOrConfig: string | PG.QueryConfig<I>,
      callback: (err: Error, result: PG.QueryResult<R>) => void,
      segment?: AWSXRay.SegmentLike
    ): void;

    <R extends PG.QueryResultRow = any, I extends any[] = any[]>(
      queryText: string,
      values: any[],
      callback: (err: Error, result: PG.QueryResult<R>) => void,
      segment?: AWSXRay.SegmentLike
    ): void;
  }

  type PatchedClientBase<T extends PG.ClientBase> = {
    [K in keyof T]: K extends 'query'
    ? CaptureQueryMethod
    : T[K];
  };

  interface PatchedClientBaseConstructor<T extends PG.ClientBase> {
    new(config?: string | PG.ClientConfig): PatchedClientBase<T>;
  }

  type PatchedClient = PatchedClientBase<PG.Client>;
  type PatchedClientConstructor = PatchedClientBaseConstructor<PG.Client>;

  type PatchedPoolClient = PatchedClientBase<PG.PoolClient>;
  type PatchedPoolClientConstructor = PatchedClientBaseConstructor<PG.PoolClient>;

  interface PatchedPoolConnectMethod {
    (): Promise<PatchedPoolClient>;
    (callback: (err: Error, client: PatchedPoolClient, done: (release?: any) => void) => void): void;
  }

  interface PatchedPoolOnMethod {
    (event: "error", listener: (err: Error, client: PatchedPoolClient) => void): PatchedPool;
    (event: "connect" | "acquire" | "remove", listener: (client: PatchedPoolClient) => void): PatchedPool;
  }

  type PatchedPool<T = PG.Pool> = {
    [K in keyof T]: K extends 'connect'
    ? PatchedPoolConnectMethod
    : K extends 'on'
    ? PatchedPoolOnMethod
    : T[K];
  };

  interface PatchedPoolConstructor {
    new(config?: PG.PoolConfig): PatchedPool;
  }

  interface PatchedEventsOnMethod {
    (event: "error", listener: (err: Error, client: PatchedClient) => void): PatchedEvents;
  }

  type PatchedEvents<T = PG.Events> = {
    [K in keyof T]: K extends 'on'
    ? PatchedEventsOnMethod
    : T[K];
  };

  interface PatchedEventsConstructor {
    new(): PatchedEvents;
  }

  type PatchedPostgres<T = typeof PG> = {
    [K in keyof T]: K extends 'Client'
    ? PatchedClientConstructor
    : K extends 'PoolClient'
    ? PatchedPoolClientConstructor
    : K extends 'Pool'
    ? PatchedPoolConstructor
    : K extends 'Events'
    ? PatchedEventsConstructor
    : T[K];
  };
}

export = capturePostgres;
