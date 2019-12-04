import * as express from 'aws-xray-sdk-express';
import captureMySQL = require('aws-xray-sdk-mysql');
import capturePostgres = require('aws-xray-sdk-postgres');
import { expectType } from 'tsd';
import * as AWSXRay from '../lib';

expectType<typeof express>(AWSXRay.express);
expectType<typeof captureMySQL>(AWSXRay.captureMySQL);
expectType<typeof capturePostgres>(AWSXRay.capturePostgres);
