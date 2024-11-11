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

const connectionMySQL: captureMySQL.PatchedConnection = mysql.createConnection(config);
const poolMySQL: captureMySQL.PatchedPool = mysql.createPool(config);
const poolClusterMySQL: captureMySQL.PatchedPoolCluster = mysql.createPoolCluster(config);

const queryCallbackMySQL: MySQL.queryCallback = function (err: MySQL.MysqlError | null, rows: any) {
};

const getConnectionCallbackMySQL = function (err: MySQL.MysqlError, conn: captureMySQL.PatchedConnection) {
};

expectType<MySQL.Query>(connectionMySQL.query('SELECT * FROM cats', queryCallbackMySQL));
expectType<MySQL.Query>(connectionMySQL.query('SELECT * FROM cats', queryCallbackMySQL, segment));

expectType<MySQL.Query>(poolMySQL.query('SELECT * FROM cats', queryCallbackMySQL));
expectType<MySQL.Query>(poolMySQL.query('SELECT * FROM cats', queryCallbackMySQL, segment));
expectType<void>(poolMySQL.getConnection(getConnectionCallbackMySQL));

expectType<void>(poolClusterMySQL.getConnection(getConnectionCallbackMySQL));
expectType<void>(poolClusterMySQL.getConnection('pattern', getConnectionCallbackMySQL));
expectType<void>(poolClusterMySQL.getConnection('pattern', 'selector', getConnectionCallbackMySQL));

expectType<captureMySQL.PatchedPool>(poolClusterMySQL.of('pattern'));
expectType<captureMySQL.PatchedPool>(poolClusterMySQL.of('pattern', 'selector'));
expectType<captureMySQL.PatchedPool>(poolClusterMySQL.of(null, 'selector'));

const connectionMySQL2: captureMySQL.PatchedMySQL2Connection = mysql2.createConnection(config);
const poolMySQL2: captureMySQL.PatchedMySQL2Pool = mysql2.createPool(config);
const poolClusterMySQL2: captureMySQL.PatchedMySQL2PoolCluster = mysql2.createPoolCluster(config);

const queryCallbackMySQL2: captureMySQL.MySQL2QueryCallback | undefined = function () { };

const getConnectionCallbackMySQL2 = function (err: MySQL.MysqlError, conn: captureMySQL.PatchedMySQL2Connection) {
};

expectType<MySQL2.Query>(connectionMySQL2.query('SELECT * FROM cats', queryCallbackMySQL2));
expectType<MySQL2.Query>(connectionMySQL2.query('SELECT * FROM cats', queryCallbackMySQL2, segment));

expectType<MySQL2.Query>(poolMySQL2.query('SELECT * FROM cats', queryCallbackMySQL2));
expectType<MySQL2.Query>(poolMySQL2.query('SELECT * FROM cats', queryCallbackMySQL2, segment));
expectType<void>(poolMySQL2.getConnection(getConnectionCallbackMySQL2));

expectType<void>(poolClusterMySQL2.getConnection(getConnectionCallbackMySQL2));
expectType<void>(poolClusterMySQL2.getConnection('pattern', 'selector', getConnectionCallbackMySQL2));

expectType<captureMySQL.PatchedMySQL2Pool>(poolClusterMySQL2.of('pattern'));
expectType<captureMySQL.PatchedMySQL2Pool>(poolClusterMySQL2.of('pattern', 'selector'));
expectType<captureMySQL.PatchedMySQL2Pool>(poolClusterMySQL2.of(null, 'selector'));
