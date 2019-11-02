import * as AWSXRay from 'aws-xray-sdk-core';
import * as MySQL from 'mysql';

declare function captureMySQL(mysql: typeof MySQL): captureMySQL.PatchedMySQL;

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
}

export = captureMySQL;
