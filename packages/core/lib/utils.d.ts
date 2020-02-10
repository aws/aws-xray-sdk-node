import Segment = require('./segments/segment');

export function getCauseTypeFromHttpStatus(status: number | string): 'error' | 'fault' | undefined;

export function stripQueryStringFromPath(path: string): string;

export function wildcardMatch(pattern: string, text: string): boolean;

export namespace LambdaUtils {
  function validTraceData(xAmznTraceId?: string): boolean;

  function populateTraceData(segment: Segment, xAmznTraceId: string): boolean;
}

export function processTraceData(traceData?: string): { [key: string]: string };

export function objectWithoutProperties<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
  preservePrototype?: boolean
): Omit<T, K>;
