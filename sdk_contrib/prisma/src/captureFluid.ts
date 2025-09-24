import { isPrismaPromise } from './utils';
import { prismaPromiseAttributes } from './constants';
import { PrismaPromise, CaptureFluidOpts } from './types';

export function captureFluid(
  promise: PrismaPromise<any>,
  { segment, model, callback, namespace, divider }: CaptureFluidOpts) {
  return new Proxy(promise, {
    get(obj, key) {
      const attr = obj[key as keyof PrismaPromise<any>];
      const actionKey = key.toString();

      if (!prismaPromiseAttributes.has(actionKey) &&
        typeof attr === 'function') {
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
      }
      callback?.();

      return attr;
    },
  });
}
