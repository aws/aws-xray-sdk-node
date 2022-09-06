import AWSXRay, { Segment, Subsegment } from 'aws-xray-sdk-core';
import { isPrismaPromise, isAction } from './utils';
import { DIVIDER, MODEL_PREFIX, prismaPromiseAttributes } from './constants';
import {
  PrismaPromise,
  PrismaClient,
  CaptureFluidOpts,
  CommonOpts,
} from './types';

function captureFluid(
  promise: PrismaPromise<any>,
  { segment, model, callback, namespace, divider }: CaptureFluidOpts
) {
  return new Proxy(promise, {
    get(obj, key) {
      const attr = obj[key as keyof PrismaPromise<any>];
      const actionKey = key.toString();

      if (!prismaPromiseAttributes.has(actionKey) && typeof attr === 'function')
        return (...args: any[]) => {
          const res = attr.bind(obj)(...args);
          const isPromise = isPrismaPromise(res);

          if (res instanceof Promise || isPromise) {
            promise.then(() => {
              try {
                const actionSegment = segment.addNewSubsegment(
                  [model, actionKey].join(divider)
                );
                actionSegment.namespace = namespace;

                res.catch(e => {
                  actionSegment.addError(e);
                });

                res.finally(() => {
                  actionSegment.close();
                });
              } catch (e) {
                console.error(e);
              } finally {
                callback?.(res);
              }
            });
          } else {
            callback?.();
          }
          return res;
        };
      callback?.();

      return attr;
    },
  });
}

interface ActionsOptions extends CommonOpts {
  modelKey: string;
  action: string;
}

function captureActions(
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
    let lastArg: Subsegment | null = args[args.length - 1];

    if (AWSXRay.isAutomaticMode()) segment = AWSXRay.getSegment();
    if (lastArg instanceof Segment || lastArg instanceof Subsegment) {
      args = args.slice(0, -1);
      segment = lastArg;
    }

    const call = () => attr.bind(obj)(...args);
    if (!segment) return call();

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
      res.finally(() => {
        actionSegment.close();
      });
      promises.push(res);
    } else {
      actionSegment.close();
    }
    const close = async () => {
      if (promises.length) {
        for (const promise of promises) {
          await new Promise<void>(resolve => {
            promise.finally(() => resolve());
          });
        }
      }
      segment?.close();
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

function captureModels(
  attr: Record<string, any>,
  modelKey: string,
  { segment, ...rest }: CommonOpts
) {
  if (AWSXRay.isAutomaticMode()) segment = AWSXRay.resolveSegment(segment);

  return new Proxy(attr, {
    get(obj, prop) {
      const key = prop.toString();
      const attr = obj[key];
      if (isAction(key)) {
        if (AWSXRay.isAutomaticMode() && segment) AWSXRay.setSegment(segment);

        return captureActions(attr, obj, {
          segment,
          modelKey,
          action: key,
          ...rest,
        });
      }
      return attr;
    },
  });
}

export function capturePrisma<T extends PrismaClient>(
  prisma: T,
  opts?: CommonOpts
): T {
  let segment: Segment | Subsegment | undefined;
  const { segment: baseSegment, ...rest } = { ...opts };
  if (!baseSegment) {
    try {
      segment = AWSXRay.resolveSegment(baseSegment);
    } catch {
      // ignore
    }
  } else segment = baseSegment;
  if (AWSXRay.isAutomaticMode()) {
    const ns = AWSXRay.getNamespace();
    return ns.runAndReturn(() => {
      if (segment) AWSXRay.setSegment(segment);
      return new Proxy(prisma, {
        get(obj, modelKey): any {
          const attr = obj[modelKey as keyof T];
          return ns.runAndReturn(() => {
            if (segment) AWSXRay.setSegment(segment);
            return captureModels(attr, modelKey.toString(), {
              segment,
              ...rest,
            });
          });
        },
      });
    });
  }
  return new Proxy(prisma, {
    get(obj, modelKey): any {
      const attr = obj[modelKey as keyof T];
      return captureModels(attr, modelKey.toString(), {
        segment,
        ...rest,
      });
    },
  });
}
