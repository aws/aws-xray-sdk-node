import { SegmentLike } from '../aws-xray';
/**
 * Instruments AWS SDK V3 clients with X-Ray via middleware.
 *
 * @param client - AWS SDK V3 client to instrument
 * @param manualSegment - Parent segment or subsegment that is passed in for manual mode users
 * @returns - the client with the X-Ray instrumentation middleware added to its middleware stack
 */
export declare function captureAWSClient<T extends { middlewareStack: { remove: any, use: any }, config: any }>(client: T, manualSegment?: SegmentLike): T
