import { Namespace } from 'cls-hooked';
import * as http from 'http';
import * as https from 'https';
import { Socket } from 'net';
import { expectType, expectError } from 'tsd';
import * as url from 'url';
import * as AWSXRay from '../lib';

expectType<void>(AWSXRay.plugins.EC2Plugin.getData((metadata?: AWSXRay.plugins.EC2Metadata) => { }));
expectType<void>(AWSXRay.plugins.ECSPlugin.getData((metadata?: AWSXRay.plugins.ECSMetadata) => { }));
expectType<void>(
  AWSXRay.plugins.ElasticBeanstalkPlugin.getData((metadata?: AWSXRay.plugins.ElasticBeanstalkMetadata) => { })
);

expectType<void>(AWSXRay.config([AWSXRay.plugins.EC2Plugin, AWSXRay.plugins.ECSPlugin]));
expectType<void>(AWSXRay.config([AWSXRay.plugins.ElasticBeanstalkPlugin]));

expectType<void>(AWSXRay.setAWSWhitelist('/path/here'));
expectType<void>(AWSXRay.setAWSWhitelist({}));
expectError(AWSXRay.setAWSWhitelist());
expectError(AWSXRay.setAWSWhitelist(null));
expectError(AWSXRay.setAWSWhitelist(0));

expectType<void>(AWSXRay.appendAWSWhitelist('/path/here'));
expectType<void>(AWSXRay.appendAWSWhitelist({}));
expectError(AWSXRay.appendAWSWhitelist());
expectError(AWSXRay.appendAWSWhitelist(null));
expectError(AWSXRay.appendAWSWhitelist(0));

expectType<void>(AWSXRay.setStreamingThreshold(10));

expectType<void>(AWSXRay.setLogger(console));
AWSXRay.getLogger().debug('debug');
AWSXRay.getLogger().info({ foo: 'bar' }, 'info');
AWSXRay.getLogger().warn('warn', 123);
AWSXRay.getLogger().error('error');

expectType<void>(AWSXRay.setDaemonAddress('192.168.0.23:8080'));

const traceId = '1-57fbe041-2c7ad569f5d6ff149137be86';
const segment = new AWSXRay.Segment('test', traceId);

expectType<string>(AWSXRay.captureFunc('tracedFcn', () => 'OK', segment));
expectType<void>(AWSXRay.captureFunc('tracedFcn', () => { return; }));
expectType<never>(AWSXRay.captureFunc('tracedFcn', () => { throw new Error(); }));
let subseg: AWSXRay.Subsegment | undefined;
expectType<void>(AWSXRay.captureFunc('tracedFcn', (sub) => { subseg = sub; }, segment));

async function fcn(seg?: AWSXRay.Subsegment) {
  if (seg) {
    seg.close();
  }
  return 'OK';
}
expectType<Promise<string>>(AWSXRay.captureAsyncFunc('tracedFcn', fcn, segment));
expectType<Promise<string>>(AWSXRay.captureAsyncFunc('tracedFcn', fcn));

function tracedFcn(callback: (param0: any, param1: any) => any) {
  callback('hello', 'there');
}
function callback(param0: any, param1: any) {
  console.log({ param0, param1 });
}
tracedFcn(AWSXRay.captureCallbackFunc('callback', callback));
tracedFcn(AWSXRay.captureCallbackFunc('callback', callback, segment));

expectType<typeof http>(AWSXRay.captureHTTPs(http, true));
expectType<typeof https>(AWSXRay.captureHTTPs(https, true));

expectType<void>(AWSXRay.captureHTTPsGlobal(http, true));
expectType<void>(AWSXRay.captureHTTPsGlobal(https, true));

expectType<void>(AWSXRay.capturePromise());
expectType<void>(AWSXRay.capturePromise.patchThirdPartyPromise(Promise));

expectType<'error' | 'fault' | undefined>(AWSXRay.utils.getCauseTypeFromHttpStatus(200));
expectType<boolean>(AWSXRay.utils.wildcardMatch('*', 'foo'));
expectType<boolean>(AWSXRay.utils.LambdaUtils.validTraceData('moop'));
expectType<boolean>(AWSXRay.utils.LambdaUtils.validTraceData());
expectType<boolean>(AWSXRay.utils.LambdaUtils.populateTraceData(segment, 'moop'));
expectType<{ [key: string]: string }>(AWSXRay.utils.processTraceData());
expectType<{ [key: string]: string }>(AWSXRay.utils.processTraceData('Root=1-58ed6027-14afb2e09172c337713486c0;'));
const urlWithoutQuery: Omit<url.UrlWithStringQuery, 'query'> = AWSXRay.utils.objectWithoutProperties(
  url.parse('url'), ['query'],
  true
);
expectError(urlWithoutQuery.query);

new AWSXRay.database.SqlData('databaseVer', 'driverVer', 'user', 'url', 'queryType');
const sqlData: AWSXRay.database.SqlData = new AWSXRay.database.SqlData();
expectType<string | undefined>(sqlData.database_version);
expectType<string | undefined>(sqlData.driver_version);
expectType<string | undefined>(sqlData.preparation);
expectType<string | undefined>(sqlData.url);
expectType<string | undefined>(sqlData.user);

expectType<void>(AWSXRay.middleware.enableDynamicNaming());
expectType<void>(AWSXRay.middleware.enableDynamicNaming('ww.*-moop.com'));
expectType<boolean>(AWSXRay.middleware.dynamicNaming);
expectType<string | null>(AWSXRay.middleware.hostPattern);
expectType<{ [key: string]: string }>(AWSXRay.middleware.processHeaders());
expectType<{ [key: string]: string }>(AWSXRay.middleware.processHeaders({}));
expectType<{ [key: string]: string }>(AWSXRay.middleware.processHeaders({ headers: {} }));
expectType<{ [key: string]: string }>(
  AWSXRay.middleware.processHeaders({ headers: { 'x-amzn-trace-id': 'Root=' + traceId } })
);
expectType<void>(AWSXRay.middleware.setDefaultName('defaultName'));
expectType<string>(AWSXRay.middleware.resolveName('www.myhost.com'));
expectType<string>(AWSXRay.middleware.resolveName());
expectType<void>(AWSXRay.middleware.disableCentralizedSampling());
expectType<void>(AWSXRay.middleware.setSamplingRules('/path/here'));
const rulesConfig: AWSXRay.middleware.RulesConfig = {
  version: 2,
  rules: [
    {
      description: 'Player moves.',
      host: '*',
      http_method: '*',
      url_path: '/api/move/*',
      fixed_target: 0,
      rate: 1
    }
  ],
  default: {
    fixed_target: 0,
    rate: 0
  }
};
expectType<void>(AWSXRay.middleware.setSamplingRules(rulesConfig));

expectType<Namespace>(AWSXRay.getNamespace());
expectType<AWSXRay.Segment | AWSXRay.Subsegment | undefined>(AWSXRay.resolveSegment(segment));
expectType<AWSXRay.Segment | AWSXRay.Subsegment | undefined>(AWSXRay.resolveSegment(undefined));
expectType<AWSXRay.Segment | AWSXRay.Subsegment | undefined>(AWSXRay.resolveSegment(null));
expectType<AWSXRay.Segment | AWSXRay.Subsegment | undefined>(AWSXRay.resolveSegment());
expectType<AWSXRay.Segment | AWSXRay.Subsegment | undefined>(AWSXRay.getSegment());
expectType<void>(AWSXRay.setSegment(segment));
expectType<boolean>(AWSXRay.isAutomaticMode());
expectType<void>(AWSXRay.enableAutomaticMode());
expectType<void>(AWSXRay.enableManualMode());
expectType<void>(AWSXRay.setContextMissingStrategy('LOG_ERROR'));
expectType<void>(AWSXRay.setContextMissingStrategy('RUNTIME_ERROR'));
expectType<void>(AWSXRay.setContextMissingStrategy(function() { }));
expectError(AWSXRay.setContextMissingStrategy('moop'));
expectError(AWSXRay.setContextMissingStrategy({}));

const rootId = '1-57fbe041-2c7ad569f5d6ff149137be86';
const parentId = 'f9c6e4f0b5116501';
new AWSXRay.Segment('foo', rootId);
new AWSXRay.Segment('foo', null, parentId);
new AWSXRay.Segment('foo');
expectType<void>(segment.setUser('user'));
expectType<void>(segment.setSDKData({ sdk_version: '1.0.0-beta' }));
expectType<void>(segment.setMatchedSamplingRule('rule'));
expectType<void>(segment.setServiceData({ version: '2.3.0', package: 'sample-app' }));
expectType<void>(segment.addPluginData({ elastic_beanstalk: { environment: 'my_environment_name' } }));
const incomingMessage = new http.IncomingMessage(new Socket());
expectType<void>(segment.addIncomingRequestData(new AWSXRay.middleware.IncomingRequestData(incomingMessage)));

function testSegmentLike(segmentLike: AWSXRay.Segment | AWSXRay.Subsegment) {
  expectType<void>(segmentLike.addAnnotation('key', true));
  expectType<void>(segmentLike.addAnnotation('key', 'value'));
  expectType<void>(segmentLike.addAnnotation('key', 123));
  expectType<void>(segmentLike.addMetadata('key', [1, 2, 3]));
  expectType<void>(segmentLike.addMetadata('key', 123));
  expectType<void>(segmentLike.addMetadata('key', 'value'));
  expectType<void>(segmentLike.addMetadata('key', [1, 2, 3], 'hello'));
  expectType<AWSXRay.Subsegment>(segmentLike.addNewSubsegment('newSubsegment'));
  expectError(segmentLike.addSubsegment({}));
  expectError(segmentLike.addSubsegment({ key: 'x' }));
  expectType<void>(segmentLike.addSubsegment(new AWSXRay.Subsegment('new')));
  expectType<void>(segmentLike.removeSubsegment(new AWSXRay.Subsegment('old')));
  expectType<void>(segmentLike.addError(new Error('error')));
  expectType<void>(segmentLike.addError('error'));
  expectType<void>(segmentLike.addError('error', true));
  expectError(segmentLike.addError(3));
  expectType<void>(segmentLike.addFaultFlag());
  expectType<void>(segmentLike.addErrorFlag());
  expectType<void>(segmentLike.addThrottleFlag());
  expectType<boolean>(segmentLike.isClosed());
  expectType<void>(segmentLike.incrementCounter());
  expectType<void>(segmentLike.incrementCounter(3));
  expectType<void>(segmentLike.decrementCounter());
  expectType<void>(segmentLike.close());
  expectType<void>(segmentLike.close(new Error('error')));
  expectType<void>(segmentLike.close('error', true));
  expectType<void>(segmentLike.close(null, false));
  expectType<void>(segmentLike.flush());
  expectType<string>(segmentLike.format());
  expectType<string>(segmentLike.toString());
}

const subsegment = new AWSXRay.Subsegment('foo');
expectType<void>(subsegment.addAttribute('name', 'value'));
expectType<void>(subsegment.addPrecursorId('id'));
expectType<void>(subsegment.addSqlData({}));
const clientRequest = new http.ClientRequest('http://localhost');
expectType<void>(subsegment.addRemoteRequestData(clientRequest, incomingMessage, true));
expectType<true | undefined>(subsegment.streamSubsegments());
expectType<{ [key: string]: any }>(subsegment.toJSON());

expectType<number>(AWSXRay.SegmentUtils.streamingThreshold);
expectType<number>(AWSXRay.SegmentUtils.getCurrentTime());
expectType<void>(AWSXRay.SegmentUtils.setOrigin('hello'));
expectType<void>(AWSXRay.SegmentUtils.setPluginData({ data: 'hello' }));
expectType<void>(AWSXRay.SegmentUtils.setSDKData({ sdk_version: '1.0.0-beta' }));
expectType<void>(AWSXRay.SegmentUtils.setServiceData({ version: '2.3.0', package: 'sample-app' }));
expectType<number>(AWSXRay.SegmentUtils.getStreamingThreshold());
expectType<void>(AWSXRay.SegmentUtils.setStreamingThreshold(0));
