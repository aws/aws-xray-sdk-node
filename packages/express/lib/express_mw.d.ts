import { ErrorRequestHandler, RequestHandler, Request } from 'express';

export function openSegment(defaultName: string): RequestHandler;

export function closeSegment(): ErrorRequestHandler;
