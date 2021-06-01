import * as AWSXRay from 'aws-xray-sdk-core';
import * as koa from 'koa';
import { expectType } from 'tsd';
import * as xrayKoa from '../lib';

const app = new koa();

app.use(xrayKoa.openSegment('defaultName'));

app.get('/', function (ctx) {
  (expectType < AWSXRay.Segment) | (undefined > ctx.segment);
  ctx.res.render('index');
});
