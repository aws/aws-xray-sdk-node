import {
  Pluggable,
  BuildMiddleware,
  MiddlewareStack,
  BuildHandlerOptions,
} from '@aws-sdk/types';

import { RegionResolvedConfig } from '@smithy/config-resolver';

import { isThrottlingError } from '@smithy/service-error-classification';

import { SdkError } from '@smithy/smithy-client';

import ServiceSegment from '../segments/attributes/aws';

import { stringify } from 'querystring';

import Subsegment from '../segments/attributes/subsegment';

const contextUtils = require('../context_utils');

const logger = require('../logger');

const { safeParseInt } = require('../utils');

import { getCauseTypeFromHttpStatus } from '../utils';
import { SegmentLike } from '../aws-xray';

const XRAY_PLUGIN_NAME = 'XRaySDKInstrumentation';

interface HttpResponse {
  response?: {
    status?: number,
    content_length?: number
  }
}

const buildAttributesFromMetadata = async (
  service: string,
  operation: string,
  region: string,
  commandInput: any,
  res: any | null,
  error: SdkError | null,
): Promise<[ServiceSegment, HttpResponse]> => {
  const { extendedRequestId, requestId, httpStatusCode: statusCode, attempts } = res?.output?.$metadata || error?.$metadata;

  const aws = new ServiceSegment(
    {
      extendedRequestId,
      requestId,
      retryCount: attempts,
      data: res?.output,
      request: {
        operation,
        params: commandInput,
        httpRequest: {
          region,
          statusCode,
        },
      },
    },
    service,
  );

  const http: HttpResponse = {};

  if (statusCode) {
    http.response = {};
    http.response.status = statusCode;
  }
  if (res?.response?.headers && res?.response?.headers['content-length'] !== undefined) {
    if (!http.response) {
      http.response = {};
    }
    http.response.content_length = safeParseInt(res.response.headers['content-length']);
  }
  return [aws, http];
};

function addFlags(http: HttpResponse, subsegment: Subsegment, err?: SdkError): void {
  if (err && isThrottlingError(err)) {
    subsegment.addThrottleFlag();
  } else if (safeParseInt(http.response?.status) === 429 || safeParseInt(err?.$metadata?.httpStatusCode) === 429) {
    subsegment.addThrottleFlag();
  }

  const cause = getCauseTypeFromHttpStatus(safeParseInt(http.response?.status));
  if (cause === 'fault') {
    subsegment.addFaultFlag();
  } else if (cause === 'error') {
    subsegment.addErrorFlag();
  }
}

const getXRayMiddleware = (config: RegionResolvedConfig, manualSegment?: SegmentLike): BuildMiddleware<any, any> => (next: any, context: any) => async (args: any) => {
  const segment = contextUtils.isAutomaticMode() ? contextUtils.resolveSegment() : manualSegment;
  const {clientName, commandName} = context;
  const commandInput = args?.input ?? {};
  const commandOperation: string = commandName.slice(0, -7); // Strip trailing "Command" string
  const operation: string = commandOperation.charAt(0).toLowerCase() + commandOperation.slice(1);
  const service: string = clientName.slice(0, -6);    // Strip trailing "Client" string

  if (!segment) {
    const output = service + '.' + operation;

    if (!contextUtils.isAutomaticMode()) {
      logger.getLogger().info('Call ' + output + ' requires a segment object' +
        ' passed to captureAWSv3Client for tracing in manual mode. Ignoring.');
    } else {
      logger.getLogger().info('Call ' + output +
        ' is missing the sub/segment context for automatic mode. Ignoring.');
    }
    return next(args);
  }

  let subsegment: Subsegment;

  if (segment.notTraced) {
    subsegment = segment.addNewSubsegmentWithoutSampling(service);
  } else {
    subsegment = segment.addNewSubsegment(service);
  }
  subsegment.addAttribute('namespace', 'aws');
  const parent = (segment instanceof Subsegment ? segment.segment : segment);
  const data = parent.segment ? parent.segment.additionalTraceData : parent.additionalTraceData;

  let traceHeader = stringify(
    {
      Root: parent.trace_id,
      Parent: subsegment.id,
      Sampled: subsegment.notTraced ? '0' : '1',
    },
    ';',
  );

  if (data != null) {
    for (const [key, value] of Object.entries(data)) {
      traceHeader += ';' + key +'=' + value;
    }
  }

  args.request.headers['X-Amzn-Trace-Id'] = traceHeader;

  let res;
  try {
    res = await next(args);
    if (!res) {
      throw new Error('Failed to get response from instrumented AWS Client.');
    }

    const [aws, http] = await buildAttributesFromMetadata(
      service,
      operation,
      await config.region(),
      commandInput,
      res,
      null,
    );

    subsegment.addAttribute('aws', aws);
    subsegment.addAttribute('http', http);

    addFlags(http, subsegment);
    subsegment.close();
    return res;
  } catch (err: any) {
    if (err.$metadata) {
      const [aws, http] = await buildAttributesFromMetadata(
        service,
        operation,
        await config.region(),
        commandInput,
        null,
        err,
      );

      subsegment.addAttribute('aws', aws);
      subsegment.addAttribute('http', http);
      addFlags(http, subsegment, err);
    }

    const errObj = { message: err.message, name: err.name, stack: err.stack || new Error().stack };
    subsegment.close(errObj, true);
    throw err;
  }
};

const xRayMiddlewareOptions: BuildHandlerOptions = {
  name: XRAY_PLUGIN_NAME,
  step: 'build',
};

const getXRayPlugin = (config: RegionResolvedConfig, manualSegment?: SegmentLike): Pluggable<any, any> => ({
  applyToStack: (stack: MiddlewareStack<any, any>) => {
    stack.add(getXRayMiddleware(config, manualSegment), xRayMiddlewareOptions);
  },
});

/**
 * Instruments AWS SDK V3 clients with X-Ray via middleware.
 *
 * @param client - AWS SDK V3 client to instrument
 * @param manualSegment - Parent segment or subsegment that is passed in for manual mode users
 * @returns - the client with the X-Ray instrumentation middleware added to its middleware stack
 */
export function captureAWSClient<T extends { middlewareStack: { remove: any, use: any }, config: any }>(client: T, manualSegment?: SegmentLike): T {
  // Remove existing middleware to ensure operation is idempotent
  client.middlewareStack.remove(XRAY_PLUGIN_NAME);
  client.middlewareStack.use(getXRayPlugin(client.config, manualSegment));
  return client;
}
