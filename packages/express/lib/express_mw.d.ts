import { ErrorRequestHandler, RequestHandler } from 'express';

export function openSegment(defaultName: string): RequestHandler;

export function closeSegment(): ErrorRequestHandler;
