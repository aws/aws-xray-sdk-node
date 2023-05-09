import Segment = require('./segments/segment');

export function format(segment: Segment): string;

export function send(segment: Segment): void;

export function setDaemonAddress(address: string): void;

export function getIp(): string;

export function getPort(): number;

export function disableReusableSocket(): void;
