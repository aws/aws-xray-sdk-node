import * as AWSXRay from 'aws-xray-sdk-core';
import * as PG from 'pg';
import { expectType } from 'tsd';
import capturePostgres = require('../lib');

const segment = AWSXRay.getSegment();

const pg = capturePostgres(PG);

const client: capturePostgres.PatchedClient = new pg.Client();

client.connect((err: Error) => { });

const pool = new pg.Pool();

pool.connect().then((client: capturePostgres.PatchedPoolClient) => { });
pool.connect((err: Error, client: capturePostgres.PatchedPoolClient, done: (release?: any) => void) => { });

pool.on('error', (err: Error, client: capturePostgres.PatchedPoolClient) => { })
  .on('connect', (client: capturePostgres.PatchedPoolClient) => { })
  .on('acquire', (client: capturePostgres.PatchedPoolClient) => { })
  .on('remove', (client: capturePostgres.PatchedPoolClient) => { });

function testQuery(client: capturePostgres.PatchedClient | capturePostgres.PatchedPoolClient): void {
  const queryCallback = (err: Error, result: PG.QueryResult) => void {
  }

  const queryArrayCallback = (err: Error, result: PG.QueryArrayResult) => void {
  }

  const queryStream = new PG.Query();
  expectType<PG.Query>(client.query(queryStream));
  expectType<PG.Query>(client.query(queryStream, segment));

  const queryArrayConfig: PG.QueryArrayConfig = {
    name: 'get-name',
    text: 'SELECT $1::text',
    values: ['brianc'],
    rowMode: 'array',
  };
  expectType<Promise<PG.QueryArrayResult>>(client.query(queryArrayConfig));
  expectType<Promise<PG.QueryArrayResult>>(client.query(queryArrayConfig, ['brianc']));
  expectType<Promise<PG.QueryArrayResult>>(client.query(queryArrayConfig, ['brianc'], segment));

  expectType<void>(client.query(queryArrayConfig, queryArrayCallback));
  expectType<void>(client.query(queryArrayConfig, queryArrayCallback));
  expectType<void>(client.query(queryArrayConfig, queryArrayCallback, segment));

  const queryConfig: PG.QueryConfig = {
    name: 'moop',
    text: 'SELECT $1::text as name',
    values: ['brianc']
  };
  expectType<Promise<PG.QueryResult>>(client.query(queryConfig));
  expectType<Promise<PG.QueryResult>>(client.query(queryConfig, ['brianc']));
  expectType<Promise<PG.QueryResult>>(client.query(queryConfig, ['brianc'], segment));

  expectType<void>(client.query(queryConfig, queryCallback));
  expectType<void>(client.query(queryConfig, queryCallback));
  expectType<void>(client.query(queryConfig, queryCallback, segment));

  const queryText = 'select $1::text as name';
  expectType<Promise<PG.QueryResult>>(client.query(queryText));
  expectType<Promise<PG.QueryResult>>(client.query(queryText, ['brianc']));
  expectType<Promise<PG.QueryResult>>(client.query(queryText, ['brianc'], segment));

  expectType<void>(client.query(queryText, queryCallback));
  expectType<void>(client.query(queryText, ['brianc'], queryCallback));
  expectType<void>(client.query(queryText, ['brianc'], queryCallback, segment));
}
