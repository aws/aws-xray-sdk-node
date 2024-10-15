/* eslint-disable @typescript-eslint/no-unused-vars */
import * as AWSXRay from 'aws-xray-sdk-core';
import * as MySQL from 'mysql';
import * as MySQL2 from 'mysql2';
import { expectType } from 'tsd';
import { captureMySQL } from '../lib';

const segment = AWSXRay.getSegment();

const mysql = captureMySQL(MySQL);
const mysql2 = captureMySQL(MySQL2);

const config = {};

const queryCallback: MySQL.queryCallback = function (err: MySQL.MysqlError | null, rows: any) {
};

const getConnectionCallback = function (err: MySQL.MysqlError, conn: captureMySQL.PatchedConnection) {
};

const connectionMySQL: captureMySQL.PatchedConnection = mysql.createConnection(config);
const poolMySQL: captureMySQL.PatchedPool = mysql.createPool(config);
const poolClusterMySQL: captureMySQL.PatchedPoolCluster = mysql.createPoolCluster(config);

const poolMySQL2: captureMySQL.PatchedMySQL2Pool = mysql2.createPool(config);
const poolClusterMySQL2: captureMySQL.PatchedMySQL2PoolCluster = mysql2.createPoolCluster(config);

mysql2.createConnection(config).then(result => {
  const connectionMySQL2: captureMySQL.PatchedConnection = result;

  expectType<MySQL.Query>(connectionMySQL2.query('SELECT * FROM cats', queryCallback));
  expectType<MySQL.Query>(connectionMySQL2.query('SELECT * FROM cats', queryCallback, segment));
});

expectType<MySQL.Query>(connectionMySQL.query('SELECT * FROM cats', queryCallback));
expectType<MySQL.Query>(connectionMySQL.query('SELECT * FROM cats', queryCallback, segment));

expectType<MySQL.Query>(poolMySQL.query('SELECT * FROM cats', queryCallback));
expectType<MySQL.Query>(poolMySQL.query('SELECT * FROM cats', queryCallback, segment));
expectType<void>(poolMySQL.getConnection(getConnectionCallback));

expectType<MySQL.Query>(poolMySQL2.query('SELECT * FROM cats', queryCallback));
expectType<MySQL.Query>(poolMySQL2.query('SELECT * FROM cats', queryCallback, segment));
poolMySQL2.getConnection().then(result => {
  expectType<captureMySQL.PatchedConnection>(result);
});

expectType<void>(poolClusterMySQL.getConnection(getConnectionCallback));
expectType<void>(poolClusterMySQL.getConnection('pattern', getConnectionCallback));
expectType<void>(poolClusterMySQL.getConnection('pattern', 'selector', getConnectionCallback));

poolClusterMySQL2.getConnection().then(result => {
  expectType<captureMySQL.PatchedConnection>(result);
});
poolClusterMySQL2.getConnection('pattern').then(result => {
  expectType<captureMySQL.PatchedConnection>(result);
});
poolClusterMySQL2.getConnection('pattern', 'selector').then(result => {
  expectType<captureMySQL.PatchedConnection>(result);
});

expectType<captureMySQL.PatchedPool>(poolClusterMySQL.of('pattern'));
expectType<captureMySQL.PatchedPool>(poolClusterMySQL.of('pattern', 'selector'));
expectType<captureMySQL.PatchedPool>(poolClusterMySQL.of(null, 'selector'));

expectType<captureMySQL.PatchedMySQL2Pool>(poolClusterMySQL2.of('pattern'));
expectType<captureMySQL.PatchedMySQL2Pool>(poolClusterMySQL2.of('pattern', 'selector'));
