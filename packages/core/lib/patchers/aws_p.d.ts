/* The type accepted and returned from patching AWS clients is generic because using types defined
 * by the aws-sdk would require us to depend on it, which would make our bundle size too large.
 * 
 * See: https://github.com/aws/aws-xray-sdk-node/pull/255
 */ 

export function captureAWS<T>(awssdk: T): T;

export function captureAWSClient<T>(service: T): T;
