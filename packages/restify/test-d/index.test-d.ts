import * as AWSXRay from 'aws-xray-sdk-core';
import * as restify from 'restify';
import { expectType } from 'tsd';
import * as AWSXRayRestify from '../lib';

const server = restify.createServer();

AWSXRayRestify.enable(server, 'defaultName');

server.get('/', function(req, res) {
  expectType<AWSXRay.Segment | undefined>(req.segment);
  res.send('hello');
});
