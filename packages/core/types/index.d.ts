import http = require('http');

import AWSClients = require('aws-sdk/clients/all');
import { Namespace } from 'continuation-local-storage';
import { LoggerInstance as Logger } from 'winston';

declare namespace AWSXRay {
    abstract class SegmentLike {
        readonly trace_id?: string;
        readonly id: string;
        readonly name: string;
        readonly in_progress: boolean;
        readonly counter: number;

        notTraced?: boolean;

        public fault?: boolean;
        public error?: boolean;
        public throttle?: boolean;

        addNewSubsegment(name: string): Subsegment;
        addAnnotation(key: string, value: boolean | number | string): void;
        addMetadata(key: string, value: any, namespace?: string): void;
        addError(err?: Error | string, remote?: boolean): void;

        addFaultFlag(): void;
        addErrorFlag(): void;
        addThrottleFlag(): void;

        incrementCounter(additional?: number): void;
        decrementCounter(): void;

        isClosed(): boolean;
        close(err?: Error | string, remote?: boolean): void;
        flush(): void;
    }

    class Segment extends SegmentLike {
        /**
         * Represents a segment.
         * @constructor
         * @param {string} name - The name of the subsegment.
         * @param {string} [rootId] - The trace ID of the spawning parent, included in the 'X-Amzn-Trace-Id' header of
         *                            the incoming request.  If one is not supplied, it will be generated.
         * @param {string} [parentId] - The sub/segment ID of the spawning parent, included in the 'X-Amzn-Trace-Id'
         *                              header of the incoming request.
         */
        constructor(name: string, rootId?: string, parentId?: string);

        readonly trace_id: string;

        readonly http?: middleware.IncomingRequestData;

        addIncomingRequestData(data: middleware.IncomingRequestData): void;
    }

    class Subsegment extends SegmentLike {
        constructor(name: string);

        segment?: Segment;

        streamSubsegments(): boolean;
    }

    type ContextMissingStrategy = 'LOG_ERROR' | 'RUNTIME_ERROR' | ((message: string) => void);

    function enableAutomaticMode(): void;
    function enableManualMode(): void;
    function isAutomaticMode(): boolean;
    function setStreamingThreshold(threshold: number): void;
    function setContextMissingStrategy(strategy: ContextMissingStrategy): void;

    function getLogger(): Logger;
    function setLogger(logger: Logger): void;
    function getSegment(): Segment;
    function setSegment(segment: SegmentLike): void;
    function resolveSegment(segment?: SegmentLike): SegmentLike | undefined;
    function getNamespace(): Namespace;

    function captureFunc(
        name: string,
        fcn: (subsegment: Subsegment) => void,
        parent?: SegmentLike,
    ): void;

    function captureAsyncFunc(
        name: string,
        fcn: (subsegment: Subsegment) => Promise<void>,
        parent?: SegmentLike,
    ): void;

    function captureCallbackFunc<A extends any[]>(
        name: string,
        fcn: (...args: A) => void,
        parent?: SegmentLike,
    ): (...args: A) => void;

    function capturePromise(): void;

    function captureAWSClient<C extends InstanceType<typeof AWSClients[keyof typeof AWSClients]>>(client: C): C;

    function captureHTTPs(mod: typeof http): typeof http;
    function captureHTTPsGlobal(mod: typeof http): void;

    namespace middleware {
        type TraceData = { [key: string]: string };

        function enableDynamicNaming(hostPattern: string): void;
        function processHeaders(req: http.IncomingMessage): TraceData;
        function resolveName(hostHeader?: string): string;
        function resolveSampling(amznTraceHeader: TraceData, segment: Segment, res: http.ServerResponse): void;
        function setDefaultName(name: string): void;

        class IncomingRequestData {
            constructor(req: http.IncomingMessage);
            close(res: http.ServerResponse): void;
        }
    }

    namespace utils {
        function getCauseTypeFromHttpStatus(status: number | string): 'error' | 'fault' | undefined;
    }
}

export = AWSXRay;
