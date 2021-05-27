import * as AWSXRay from 'aws-xray-sdk-core';
import * as hapi from '@hapi/hapi';
import { expectType } from 'tsd';
import * as hapiXray from '../lib';

const server = new hapi.Server();
hapiXray.plugin.register(server);

server.route({
  method: 'GET',
  path: '/',
  handler: (request) => {
    (expectType < AWSXRay.Segment) | (undefined > request.segment);
    return { data: 'ok' };
  },
});
