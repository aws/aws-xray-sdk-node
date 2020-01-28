import { Namespace } from 'cls-hooked';
import Segment = require('./segments/segment');
import Subsegment = require('./segments/attributes/subsegment');

export function getNamespace(): Namespace;

export function resolveSegment(segment?: Segment | Subsegment | null): Segment | Subsegment | undefined;

export function getSegment(): Segment | Subsegment | undefined;

export function setSegment(segment: Segment | Subsegment): void;

export function isAutomaticMode(): boolean;

export function enableAutomaticMode(): void;

export function enableManualMode(): void;

export type ContextMissingStrategy = 'LOG_ERROR' | 'RUNTIME_ERROR' | ((msg: string) => void);

export function setContextMissingStrategy(strategy: ContextMissingStrategy): void;
