import AWSXRay from 'aws-xray-sdk-core';
import { isAction } from './utils';
import { CommonOpts } from './types';
import { captureActions } from './captureActions';

export function captureModels(
  attr: Record<string, any>,
  modelKey: string,
  { segment, ...rest }: CommonOpts
) {
  if (AWSXRay.isAutomaticMode()) {
    segment = AWSXRay.resolveSegment(segment);
  }

  if (!attr || attr instanceof Function) {
    return attr;
  }

  return new Proxy(attr, {
    get(obj, prop) {
      const key = prop.toString();
      const attr = obj[key];
      if (isAction(key)) {
        if (AWSXRay.isAutomaticMode() && segment) {
          AWSXRay.setSegment(segment);
        }

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
