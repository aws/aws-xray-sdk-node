/* eslint-disable @typescript-eslint/no-unused-vars */
import * as ec2Plugin from './segments/plugins/ec2_plugin';
import * as ecsPlugin from './segments/plugins/ecs_plugin';
import * as elasticBeanstalkPlugin from './segments/plugins/elastic_beanstalk_plugin';
import * as segmentUtils from './segments/segment_utils';
import * as utils from './utils';
import * as middleware from './middleware/mw_utils';
import Segment = require('./segments/segment');
import Subsegment = require('./segments/attributes/subsegment');
import sqlData = require('./database/sql_data');
import TraceID = require('./segments/attributes/trace_id');

export namespace plugins {
  const EC2Plugin: typeof ec2Plugin;
  const ECSPlugin: typeof ecsPlugin;
  const ElasticBeanstalkPlugin: typeof elasticBeanstalkPlugin;

  type EC2Plugin = typeof ec2Plugin;
  type ECSPlugin = typeof ecsPlugin;
  type ElasticBeanstalkPlugin = typeof elasticBeanstalkPlugin;

  type EC2Metadata = ec2Plugin.EC2Metadata;
  type ECSMetadata = ecsPlugin.ECSMetadata;
  type ElasticBeanstalkMetadata = elasticBeanstalkPlugin.ElasticBeanstalkMetadata;

  type Plugin = EC2Plugin | ECSPlugin | ElasticBeanstalkPlugin;
}

export function config(plugins: plugins.Plugin[]): void;

export { appendAWSWhitelist, setAWSWhitelist } from './segments/attributes/aws';

export { setStreamingThreshold } from './segments/segment_utils';

export { setLogger, getLogger, Logger } from './logger';

export { setDaemonAddress } from './daemon_config';

export { captureAsyncFunc, captureCallbackFunc, captureFunc } from './capture';

export { captureAWS, captureAWSClient } from './patchers/aws_p';

export { captureAWSClient as captureAWSv3Client } from './patchers/aws3_p';

export { captureHTTPs, captureHTTPsGlobal } from './patchers/http_p';

export { capturePromise } from './patchers/promise_p';

export { utils };

export namespace database {
  const SqlData: typeof sqlData;
  type SqlData = sqlData;
}

export { middleware };

export {
  getNamespace,
  resolveSegment,
  getSegment,
  setSegment,
  isAutomaticMode,
  enableAutomaticMode,
  enableManualMode,
  setContextMissingStrategy
} from './context_utils';

export {
  Segment,
  Subsegment,
  TraceID,
  segmentUtils as SegmentUtils
};

export type SegmentLike = Segment | Subsegment;
