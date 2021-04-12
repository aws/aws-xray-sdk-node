import * as AWSXRay from 'aws-xray-sdk-core';
import * as express from 'express';
import { expectType } from 'tsd';
import * as xrayExpress from '../lib';

const app = express();

app.use(xrayExpress.openSegment('defaultName'));

app.get('/', function(req, res) {
  expectType<AWSXRay.Segment | undefined>(req.segment);
  res.render('index');
});

app.use(xrayExpress.closeSegment());
