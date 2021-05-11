import { Client, MetadataBearer } from '@aws-sdk/types';
import { RegionResolvedConfig } from '@aws-sdk/config-resolver';
import { SegmentLike } from '../aws-xray';
/**
 * Instruments AWS SDK V3 clients with X-Ray via middleware.
 *
 * @param client - AWS SDK V3 client to instrument
 * @param manualSegment - Parent segment or subsegment that is passed in for manual mode users
 * @returns - the client with the X-Ray instrumentation middleware added to its middleware stack
 */
export declare function captureAWSClient<Input extends object, Output extends MetadataBearer, Configuration extends RegionResolvedConfig>(client: Client<Input, Output, Configuration>, manualSegment?: SegmentLike): Client<Input, Output, Configuration>;
