import * as http from 'http';
import Segment = require('../segments/segment');
import IncomingRequestData = require('./incoming_request_data');

export const defaultName: string | undefined;

export const dynamicNaming: boolean;

export const hostPattern: string | null;

export function enableDynamicNaming(hostPattern?: string): void;

export function processHeaders(req?: Partial<Pick<http.IncomingMessage, 'headers'>>): { [key: string]: string };

export function resolveName(hostHeader?: string): string;

export function resolveSampling(
  amznTraceHeader: { [key: string]: string },
  segment: Segment,
  res: http.ServerResponse
): void;

export function setDefaultName(name: string): void;

export function disableCentralizedSampling(): void;

export interface BaseRuleConfig {
  http_method: string;
  url_path: string;
  fixed_target: number;
  rate: number;
  description?: string;
}

export interface RuleConfigV1 extends BaseRuleConfig {
  service_name: string;
}

export interface RuleConfigV2 extends BaseRuleConfig {
  host: string;
}

export type RuleConfig = RuleConfigV1 | RuleConfigV2;

export interface DefaultRuleConfig {
  fixed_target: number;
  rate: number;
}

export interface RulesConfig {
  version: number;
  default: DefaultRuleConfig;
  rules?: RuleConfig[];
}

export function setSamplingRules(source: string | RulesConfig): void;

export {
  IncomingRequestData
}
