import AWSXRay, { Segment, Subsegment } from 'aws-xray-sdk-core';

import { PrismaClient, CommonOpts } from './types';
import { captureModels } from './captureModels';
import { captureActions } from './captureActions';

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
  } else {
    segment = baseSegment;
  }
  if (AWSXRay.isAutomaticMode()) {
    const ns = AWSXRay.getNamespace();
    return ns.runAndReturn(() => {
      if (segment) {
        AWSXRay.setSegment(segment);
      }
      return new Proxy(prisma, {
        get(obj, modelKey): any {
          const key = modelKey.toString();
          const attr = obj[modelKey as keyof T];

          // Allow direct access to internal properties (starting with _)
          if (key.startsWith('_')) {
            return attr;
          }

          // Handle $extends specially - needs to capture the resulting extended client
          if (key === '$extends' && typeof attr === 'function') {
            return (...args: any[]) => {
              const extended = attr.bind(obj)(...args);
              // Capture the extended client as well
              return capturePrisma(extended, { segment, ...rest });
            };
          }

          // Capture client methods starting with $ (like $queryRaw, $queryRawUnsafe, etc.)
          if (key.startsWith('$') && typeof attr === 'function') {
            return ns.runAndReturn(() => {
              if (segment) {
                AWSXRay.setSegment(segment);
              }
              return captureActions(attr, obj, {
                segment,
                modelKey: '',
                action: key,
                ...rest,
              });
            });
          }

          return ns.runAndReturn(() => {
            if (segment) {
              AWSXRay.setSegment(segment);
            }
            return captureModels(attr, key, {
              segment,
              ...rest,
            });
          });
        },
      });
    });
  }

  if (!segment) {
    console.error('No segment provided when is manual mode');
  }

  return new Proxy(prisma, {
    get(obj, modelKey): any {
      const key = modelKey.toString();
      const attr = obj[modelKey as keyof T];

      // Allow direct access to internal properties (starting with _)
      if (key.startsWith('_')) {
        return attr;
      }

      // Handle $extends specially - needs to capture the resulting extended client
      if (key === '$extends' && typeof attr === 'function') {
        return (...args: any[]) => {
          const extended = attr.bind(obj)(...args);
          // Capture the extended client as well
          return capturePrisma(extended, { segment, ...rest });
        };
      }

      // Capture client methods starting with $ (like $queryRaw, $queryRawUnsafe, etc.)
      if (key.startsWith('$') && typeof attr === 'function') {
        return captureActions(attr, obj, {
          segment,
          modelKey: '',
          action: key,
          ...rest,
        });
      }

      return captureModels(attr, key, {
        segment,
        ...rest,
      });
    },
  });
}
