import * as AWSXRay from 'aws-xray-sdk-core';
import * as MySQL from 'mysql';
import type * as MySQL2 from 'mysql2';

export function captureMySQL(mysql: typeof MySQL): captureMySQL.PatchedMySQL;
export function captureMySQL(mysql2: typeof MySQL2): captureMySQL.PatchedMySQL2;

declare namespace captureMySQL {
  interface PatchedQueryFunction {
    (query: MySQL.Query, segment?: AWSXRay.SegmentLike): MySQL.Query;
    (options: string | MySQL.QueryOptions, callback?: MySQL.queryCallback, segment?: AWSXRay.SegmentLike): MySQL.Query;
    (options: string, values: any, callback?: MySQL.queryCallback, segment?: AWSXRay.SegmentLike): MySQL.Query;
  }

  type PatchedConnection<T = MySQL.Connection> = {
    [K in keyof T]: K extends 'query'
    ? PatchedQueryFunction
    : T[K];
  };

  type PatchedPoolConnection = PatchedConnection<MySQL.PoolConnection>;

  type PatchedPoolConnectionCallback = (err: MySQL.MysqlError, connection: PatchedPoolConnection) => void;

  interface PatchedPoolGetConnectionFunction {
    (callback: PatchedPoolConnectionCallback): void;
  }

  type PatchedPool<T = MySQL.Pool> = {
    [K in keyof T]: K extends 'query'
    ? PatchedQueryFunction
    : K extends 'getConnection'
    ? PatchedPoolGetConnectionFunction
    : T[K];
  };

  interface PatchedPoolClusterOfFunction {
    (pattern: string, selector?: string): PatchedPool;
    (pattern: undefined | null | false, selector: string): PatchedPool;
  }

  interface PatchedPoolClusterGetConnectionFunction {
    (callback: PatchedPoolConnectionCallback): void;
    (pattern: string, callback: PatchedPoolConnectionCallback): void;
    (pattern: string, selector: string, callback: PatchedPoolConnectionCallback): void;
  }

  type PatchedPoolCluster<T = MySQL.PoolCluster> = {
    [K in keyof T]: K extends 'of'
    ? PatchedPoolClusterOfFunction
    : K extends 'getConnection'
    ? PatchedPoolClusterGetConnectionFunction
    : T[K]
  };

  interface PatchedCreateConnectionFunction {
    (connectionUri: string | MySQL.ConnectionConfig): PatchedConnection;
  }

  interface PatchedCreatePoolFunction {
    (config: MySQL.PoolConfig | string): PatchedPool;
  }

  interface PatchedCreatePoolClusterFunction {
    (config?: MySQL.PoolClusterConfig): PatchedPoolCluster;
  }

  type PatchedMySQL<T = typeof MySQL> = {
    [K in keyof T]: K extends 'createConnection'
    ? PatchedCreateConnectionFunction
    : K extends 'createPool'
    ? PatchedCreatePoolFunction
    : K extends 'createPoolCluster'
    ? PatchedCreatePoolClusterFunction
    : T[K];
  };

  interface PatchedMySQL2QueryFunction {
    <T extends MySQL2.QueryResult>(
      sql: string,
      callback?:
        | ((err: MySQL2.QueryError | null, result: T, fields: MySQL2.FieldPacket[]) => any)
        | undefined,
      segment?: AWSXRay.SegmentLike
    ): MySQL2.Query;
    <T extends MySQL2.QueryResult>(
      sql: string,
      values: any,
      callback?:
        | ((err: MySQL2.QueryError | null, result: T, fields: MySQL2.FieldPacket[]) => any)
        | undefined,
      segment?: AWSXRay.SegmentLike
    ): MySQL2.Query;
    <T extends MySQL2.QueryResult>(
      options: MySQL2.QueryOptions,
      callback?:
        | ((err: MySQL2.QueryError | null, result: T, fields?: MySQL2.FieldPacket[]) => any)
        | undefined,
      segment?: AWSXRay.SegmentLike
    ): MySQL2.Query;
    <T extends MySQL2.QueryResult>(
      options: MySQL2.QueryOptions,
      values: any,
      callback?:
        | ((err: MySQL2.QueryError | null, result: T, fields: MySQL2.FieldPacket[]) => any)
        | undefined,
      segment?: AWSXRay.SegmentLike
    ): MySQL2.Query;
  }

  type MySQL2QueryCallback = <T extends MySQL2.QueryResult>(err: MySQL2.QueryError | null, result: T, fields: MySQL2.FieldPacket[]) => any;

  type PatchedMySQL2Connection<T = MySQL2.Connection> = {
    [K in keyof T]: K extends 'query'
    ? PatchedMySQL2QueryFunction
    : T[K];
  };

  type PatchedMySQL2PoolConnection = PatchedMySQL2Connection<MySQL2.PoolConnection>;

  type PatchedMySQL2PoolConnectionCallback = (err: MySQL.MysqlError, connection: PatchedMySQL2PoolConnection) => void;

  interface PatchedMySQL2PoolGetConnectionFunction {
    (callback: PatchedMySQL2PoolConnectionCallback): void;
  }

  type PatchedMySQL2Pool<T = MySQL2.Pool> = {
    [K in keyof T]: K extends 'query'
    ? PatchedMySQL2QueryFunction
    : K extends 'getConnection'
    ? PatchedMySQL2PoolGetConnectionFunction
    : T[K];
  };

  interface PatchedMySQL2PoolClusterOfFunction {
    (pattern?: string, selector?: string): PatchedMySQL2Pool;
  }

  interface PatchedMySQL2PoolClusterGetConnectionFunction {
    (callback: PatchedMySQL2PoolConnectionCallback): void;
    (pattern: string, selector: string, callback: PatchedMySQL2PoolConnectionCallback): void;
  }

  type PatchedMySQL2PoolCluster<T = MySQL2.PoolCluster> = {
    [K in keyof T]: K extends 'of'
    ? PatchedMySQL2PoolClusterOfFunction
    : K extends 'getConnection'
    ? PatchedMySQL2PoolClusterGetConnectionFunction
    : T[K]
  };

  interface PatchedMySQL2CreateConnectionFunction {
    (config: MySQL2.ConnectionOptions | string): PatchedMySQL2Connection;
  }

  interface PatchedMySQL2CreatePoolFunction {
    (config: MySQL2.PoolOptions | string): PatchedMySQL2Pool;
  }

  interface PatchedMySQL2CreatePoolClusterFunction {
    (config?: MySQL2.PoolClusterOptions): PatchedMySQL2PoolCluster;
  }

  type PatchedMySQL2<T = typeof MySQL2> = {
    [K in keyof T]: K extends 'createConnection'
    ? PatchedMySQL2CreateConnectionFunction
    : K extends 'createPool'
    ? PatchedMySQL2CreatePoolFunction
    : K extends 'createPoolCluster'
    ? PatchedMySQL2CreatePoolClusterFunction
    : T[K];
  };
}
