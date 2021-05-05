import { Pluggable, Client, MetadataBearer } from '@aws-sdk/types';
import { RegionResolvedConfig } from '@aws-sdk/config-resolver';
import { SegmentLike } from '../aws-xray';
export declare const getXRayPlugin: (config: RegionResolvedConfig, manualSegment?: SegmentLike) => Pluggable<any, any>;
/**
 * Original API to capture an AWS SDK V3, it is now deprecated and acts as a no-op.
 *
 * @param client - AWS SDK V3 client to instrument
 * @param manualSegment - Parent segment or subsegment that is passed in for manual mode users
 * @returns - the original client
 */
export declare function captureAWSClient<Input extends object, Output extends MetadataBearer, Configuration extends RegionResolvedConfig>(client: Client<Input, Output, Configuration>, manualSegment?: SegmentLike): Client<Input, Output, Configuration>;
