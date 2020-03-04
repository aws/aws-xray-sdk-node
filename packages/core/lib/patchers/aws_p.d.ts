/* The types returned from patching AWS clients is left as any because using types defined
 * by the aws-sdk would require us to depend on that package, which would make our bundle size unreasonable.
 * Instead, it is recommended to cast patched AWS clients back to their original types.
 * 
 * See: https://github.com/aws/aws-xray-sdk-node/issues/113
 */ 

export type PatchedAWS = any;
export type PatchedAWSClient = any; 

export function captureAWS(awssdk: any): PatchedAWS;

export function captureAWSClient(service: any): PatchedAWSClient;
