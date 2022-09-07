import AWSXRay, { Segment, Subsegment } from 'aws-xray-sdk-core';
import { isPrismaPromise } from './utils';
import { DIVIDER, MODEL_PREFIX } from './constants';
import { CommonOpts } from './types';
import { captureFluid } from './captureFluid';

interface ActionsOptions extends CommonOpts {
  modelKey: string;
  action: string;
}
export function captureActions(
  attr: any,
  obj: any,
  {
    segment: baseSegment,
    action,
    namespace,
    modelKey,
    modelPrefix = MODEL_PREFIX,
    divider = DIVIDER,
  }: ActionsOptions
) {
  return (...args: any[]): any => {
    let segment = baseSegment;
    const lastArg: Subsegment | null = args[args.length - 1];

    if (AWSXRay.isAutomaticMode()) {
      segment = AWSXRay.getSegment();
    }
    if (lastArg instanceof Segment || lastArg instanceof Subsegment) {
      args = args.slice(0, -1);
      segment = lastArg;
    }

    const call = () => attr.bind(obj)(...args);
    if (!segment) {
      return call();
    }

    const model = [modelPrefix, modelKey].filter(Boolean).join(divider);
    const actionSegment = segment.addNewSubsegment(
      [model, action].join(divider)
    );
    actionSegment.namespace = namespace;
    const res = call();
    const isPromise = isPrismaPromise(res);
    const promises: Promise<any>[] = [];
    if (res instanceof Promise || isPromise) {
      res.catch(e => {
        actionSegment.addError(e);
      });
      promises.push(res);
    }

    const close = async () => {
      if (promises.length) {
        for (const promise of promises) {
          await new Promise<void>(resolve => {
            promise.finally(() => resolve());
          });
        }
      }
      actionSegment?.close();
    };

    if (isPromise) {
      const promiseFluid = captureFluid(res, {
        callback: promise => {
          promise && promises.push(promise);
          close();
        },
        divider,
        modelPrefix,
        namespace,
        segment: actionSegment,
        model,
      });
      return promiseFluid;
    }
    close();
    return res;
  };
}
