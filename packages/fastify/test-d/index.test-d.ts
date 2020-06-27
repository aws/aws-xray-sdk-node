import * as AWSXRay from 'aws-xray-sdk-core';
import * as fastify from "fastify";
import { expectType } from 'tsd';
import * as xrayFastify from '../lib';

const app = fastify();

app.register(xrayFastify({ defaultName: 'defaultName' }));

app.get('/', function(req, res) {
  expectType<AWSXRay.Segment | undefined>(req.segment);
  res.render('index');
});
