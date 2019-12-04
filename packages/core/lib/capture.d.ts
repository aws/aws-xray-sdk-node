import Segment = require('./segments/segment');
import Subsegment = require('./segments/attributes/subsegment');

export function captureFunc<T>(name: string, fcn: (subsegment?: Subsegment) => T, parent?: Segment | Subsegment): T;

export function captureAsyncFunc<T>(
  name: string,
  fcn: (subsegment?: Subsegment) => T,
  parent?: Segment | Subsegment
): T;

export function captureCallbackFunc<S extends any[], T>(
  name: string,
  fcn: (...args: S) => T,
  parent?: Segment | Subsegment
): (...args: S) => T;
