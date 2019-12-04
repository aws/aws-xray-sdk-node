import * as AWS from 'aws-sdk';
import Segment = require('../segments/segment');
import Subsegment = require('../segments/attributes/subsegment');

export type Callback<D> = (err: AWS.AWSError | undefined, data: D) => void;

export interface AWSRequestMethod<P, D> {
  (params: P, callback?: Callback<D>): AWS.Request<D, AWS.AWSError>;
  (callback?: Callback<D>): AWS.Request<D, AWS.AWSError>;
}

export type PatchedAWSRequestMethod<P, D> = AWSRequestMethod<P & { XRaySegment?: Segment | Subsegment }, D>;

export type PatchedAWSClient<T extends AWS.Service> = {
  [K in keyof T]: T[K] extends AWSRequestMethod<infer P, infer D>
  ? PatchedAWSRequestMethod<P, D>
  : T[K]
};

export interface AWSClientConstructor<P, T extends typeof AWS.Service> {
  new(params?: P): InstanceType<T>;
}

export interface PatchedAWSClientConstructor<P, T extends typeof AWS.Service> {
  new(params?: P): PatchedAWSClient<InstanceType<T>>;
}

export type PatchedAWS<T = typeof AWS> = {
  [K in keyof T]: T[K] extends typeof AWS.Service
  ? (T[K] extends AWSClientConstructor<infer P, T[K]>
    ? PatchedAWSClientConstructor<P, T[K]>
    : T[K])
  : T[K];
};

export function captureAWS(awssdk: typeof AWS): PatchedAWS;

export function captureAWSClient<T extends AWS.Service>(service: T): PatchedAWSClient<T>;
