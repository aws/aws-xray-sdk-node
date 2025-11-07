import { Segment, Subsegment } from 'aws-xray-sdk-core';

declare const prisma: unique symbol;
export type PrismaPromise<A> = Promise<A> & { [prisma]: true } & {
  [key: string]: (...args: any[]) => PrismaPromise<any>;
};

export type PrismaClient = Record<string, any>;

export interface CommonOpts {
  segment?: Segment | Subsegment;
  namespace?: string;
  modelPrefix?: string | null;
  divider?: string;
}

export interface CaptureFluidOpts extends CommonOpts {
  segment: Subsegment;
  model: string;
  callback?: (promise?: Promise<any>) => void;
}
