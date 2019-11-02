import * as AWSXRay from 'aws-xray-sdk-core';
import * as MySQL from 'mysql';
import { expectType } from 'tsd';
import captureMySQL = require('../lib');

const segment = AWSXRay.getSegment();

const mysql = captureMySQL(MySQL);

const config = {};

const connection: captureMySQL.PatchedConnection = mysql.createConnection(config);
const pool: captureMySQL.PatchedPool = mysql.createPool(config);
const poolCluster: captureMySQL.PatchedPoolCluster = mysql.createPoolCluster(config);

const queryCallback: MySQL.queryCallback = function(err: MySQL.MysqlError | null, rows: any) {
}

const getConnectionCallback = function(err: MySQL.MysqlError, conn: captureMySQL.PatchedConnection) {
}

expectType<MySQL.Query>(connection.query('SELECT * FROM cats', queryCallback));
expectType<MySQL.Query>(connection.query('SELECT * FROM cats', queryCallback, segment));

expectType<MySQL.Query>(pool.query('SELECT * FROM cats', queryCallback));
expectType<MySQL.Query>(pool.query('SELECT * FROM cats', queryCallback, segment));
expectType<void>(pool.getConnection(getConnectionCallback));

expectType<void>(poolCluster.getConnection(getConnectionCallback));
expectType<void>(poolCluster.getConnection('pattern', getConnectionCallback));
expectType<void>(poolCluster.getConnection('pattern', 'selector', getConnectionCallback));

expectType<captureMySQL.PatchedPool>(poolCluster.of('pattern'));
expectType<captureMySQL.PatchedPool>(poolCluster.of('pattern', 'selector'));
expectType<captureMySQL.PatchedPool>(poolCluster.of(null, 'selector'));
