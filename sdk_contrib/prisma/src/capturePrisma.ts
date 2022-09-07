import AWSXRay, { Segment, Subsegment } from 'aws-xray-sdk-core';

import { PrismaClient, CommonOpts } from './types';
import { captureModels } from './captureModels';

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
          const attr = obj[modelKey as keyof T];
          return ns.runAndReturn(() => {
            if (segment) {
              AWSXRay.setSegment(segment);
            }
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
