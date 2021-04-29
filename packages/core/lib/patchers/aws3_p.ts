import {
  MetadataBearer,
  ResponseMetadata,
  Pluggable,
  // Client,
} from '@aws-sdk/types';

import { RegionInputConfig } from '@aws-sdk/config-resolver';

import { isThrottlingError } from '@aws-sdk/service-error-classification';

import ServiceSegment from '../segments/attributes/aws';

import { stringify } from 'querystring';

import Subsegment from '../segments/attributes/subsegment';

var contextUtils = require('../context_utils');

var logger = require('../logger');

import { getCauseTypeFromHttpStatus } from '../utils';
import { Client, Command, SdkError } from '@aws-sdk/smithy-client';
import { SegmentLike } from '../aws-xray';

interface HttpResponse {
  response: {
    status?: number,
    content_length?: number
  }
};

interface ResponseObj extends MetadataBearer {
  headers: {
    [key: string]: string,
  }
};

async function buildAttributesFromMetadata(
  service: string,
  region: string,
  operation: string,
  response: ResponseObj,
): Promise<[ServiceSegment, HttpResponse]> {
  const { extendedRequestId, requestId, httpStatusCode: statusCode, attempts } = response.$metadata;

  const aws = new ServiceSegment(
    {
      extendedRequestId,
      requestId,
      retryCount: attempts,
      request: {
        operation,
        httpRequest: {
          // region: await client.config.region(),
          region,
          statusCode,
        },
      },
    },
    service,
  );

  const http: HttpResponse = {
    response: {}
  };

  if (statusCode) {
    http.response.status = statusCode;
  }
  if (response.headers && response.headers['content-length'] !== undefined) {
    http.response.content_length = response.headers['content-length'];
  }
  return [aws, http];
}

function addFlags(http: HttpResponse, subsegment: Subsegment, err?: SdkError): void {
  if (err && isThrottlingError(err)) {
    subsegment.addThrottleFlag();
  } else if (http.response?.status === 429) {
    subsegment.addThrottleFlag();
  }

  const cause = getCauseTypeFromHttpStatus(http.response?.status);
  if (cause === 'fault') {
    subsegment.addFaultFlag();
  } else if (cause === 'error') {
    subsegment.addErrorFlag();
  }
}

type DefaultConfiguration = RegionInputConfig & {
  serviceId: string;
};

/**
import { Client } from "@aws-sdk/smithy-client" ;
import { S3 } from "@aws-sdk/client-s3";
export const captureAWSClient = <T extends Client<any, any, any, any>> (client: T): T => {
    return client;
} 
 */

function captureAWSClient<T extends Client<any, any, any, any>
  // Input extends object,
  // Output extends MetadataBearer,
  // Configuration extends DefaultConfiguration
>(client: T, manualSegment?: SegmentLike): T {
  // create local copy so that we can later call it
  const send = client.send;

  const serviceIdentifier = client.config.serviceId;

  client.send = async (...args: Parameters<typeof client.send>): Promise<Output> => {
    const [command] = args;
    const segment = manualSegment || contextUtils.resolveSegment();

    let operation: string = command.constructor.name.slice(0, -7);

    if (!segment) {
      const output = serviceIdentifier + '.' + operation;

      if (!contextUtils.isAutomaticMode()) {
        logger.getLogger().info('Call ' + output + ' requires a segment object' +
          ' on the request params as "XRaySegment" for tracing in manual mode. Ignoring.');
      } else {
        logger.getLogger().info('Call ' + output +
          ' is missing the sub/segment context for automatic mode. Ignoring.');
      }
      return send.apply(client, args) as Promise<Output>;
    }

    const subsegment = segment.addNewSubsegment(serviceIdentifier);
    subsegment.addAttribute('namespace', 'aws');

    try {
      const res = (await send.apply(client, [command])) as Output;

      if (!res) throw new Error('Failed to get response from instrumented AWS Client.');

      const [aws, http] = await buildAttributesFromMetadata(
        client,
        command,
        res.$metadata,
      );

      subsegment.addAttribute('aws', aws);
      subsegment.addAttribute('http', http);

      addFlags(http, subsegment);
      subsegment.close();
      return res;
    } catch (err) {
      if (err.$metadata) {
        const [aws, http] = await buildAttributesFromMetadata(
          client,
          command,
          err.$metadata,
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

  return client;
}

interface XRayPlugin extends Pluggable<object, object> {
  manualSegment: SegmentLike | null,
  setManualSegment: (seg: SegmentLike) => void
}

const XRayPluginImpl: XRayPlugin = {
  manualSegment: null,

  applyToStack: (stack) => {
    stack.add(
      (next: any, context: any) => async (args: any) => {
        const segment =  contextUtils.isAutomaticMode() ? contextUtils.resolveSegment() : XRayPluginImpl.manualSegment;
        const {clientName, commandName} = context;
        const operation = commandName.slice(0, -7); // Strip trailing "command" string
        const service = clientName.slice(0, -6);    // Strip trailing "client" string

        if (!segment) {
          const output = service + '.' + operation;
    
          if (!contextUtils.isAutomaticMode()) {
            logger.getLogger().info('Call ' + output + ' requires a segment object' +
              ' on the request params as "XRaySegment" for tracing in manual mode. Ignoring.');
          } else {
            logger.getLogger().info('Call ' + output +
              ' is missing the sub/segment context for automatic mode. Ignoring.');
          }
          return next(args);
        }

        const subsegment = segment.addNewSubsegment(service);
        subsegment.addAttribute('namespace', 'aws');

        const parent = (segment instanceof Subsegment
          ? segment.segment
          : segment);
      
        args.request.headers['X-Amzn-Trace-Id'] = stringify(
          {
            Root: parent.trace_id,
            Parent: subsegment.id,
            Sampled: parent.notTraced ? '0' : '1',
          },
          ';',
        );

        let res: ResponseObj;

        try {
          res = next(args);
          if (!res) throw new Error('Failed to get response from instrumented AWS Client.');

          // TODO: Figure out how to get region obj
          const [aws, http] = await buildAttributesFromMetadata(
            service,
            '',
            operation,
            res,
          );

          subsegment.addAttribute('aws', aws);
          subsegment.addAttribute('http', http);

          addFlags(http, subsegment);
          subsegment.close();
          return res;
        } catch (err) {
          if (err.$metadata) {
            const [aws, http] = await buildAttributesFromMetadata(
              service,
              operation,
              '',
              err,
            );
    
            subsegment.addAttribute('aws', aws);
            subsegment.addAttribute('http', http);
            addFlags(http, subsegment, err);
          }
        }
      },
      {
        name: 'xrayInstrumentation',
        step: 'build',
      },
    )
  },

  setManualSegment: (seg: SegmentLike) => {
    XRayPluginImpl.manualSegment = seg;
  }
}
