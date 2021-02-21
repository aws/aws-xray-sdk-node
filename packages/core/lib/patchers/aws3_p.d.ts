import type { MetadataBearer, Client } from '@aws-sdk/types';
import type { RegionInputConfig } from '@aws-sdk/config-resolver';
import { SegmentLike } from '../aws-xray';
declare type DefaultConfiguration = RegionInputConfig & {
    serviceId: string;
};
export declare function captureAWSClient<Input extends object, Output extends MetadataBearer, Configuration extends DefaultConfiguration>(client: Client<Input, Output, Configuration>, manualSegment?: SegmentLike): Client<Input, Output, Configuration>;
export {};
