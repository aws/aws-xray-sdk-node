# Changelog for AWS X-Ray Core SDK for JavaScript
<!--LATEST=1.3.0-->
<!--ENTRYINSERT-->

## 1.3.0
* improvement: The SDK now uses fewer sockets when running on Lambda by batching the send operations. [#PR42](https://github.com/aws/aws-xray-sdk-node/pull/42)
* improvement: Moment is replaced by date-fns for smaller bundle size. [#PR44](https://github.com/aws/aws-xray-sdk-node/pull/44)
* improvement: Underscore is replaced by lodash for smaller bundle size. [#PR43](https://github.com/aws/aws-xray-sdk-node/pull/43)
* feature: New method `patchThirdPartyPromise` so you can patch context binding on third party promise libraries. [#PR40](https://github.com/aws/aws-xray-sdk-node/pull/40)
* docs: Fix node version requirement on docs. [#PR46](https://github.com/aws/aws-xray-sdk-node/pull/46)

## 1.2.0
* feature: All S3 operations are added to `aws_whitelist.json`. [#PR17](https://github.com/aws/aws-xray-sdk-node/pull/17)
* feature: Opt-in patch on CLS so subsegments generated within V8 native Promise have correct hierarchy. [#PR11](https://github.com/aws/aws-xray-sdk-node/pull/11) 
* bugfix: Fixed http client capture with a string passed in `get()` and `request()`. [#ISSUE16](https://github.com/aws/aws-xray-sdk-node/issues/16)
* bugfix: Fixed http subsegment would be left unclosed if response is not consumed. [#ISSUE18](https://github.com/aws/aws-xray-sdk-node/issues/18)

## 1.1.7
* bugfix: Fixed issue where undefined host name would not match any path based sampling rule.

## 1.1.5
* The X-Ray SDK for Node.js is now an open source project. You can follow the project and submit issues and pull requests on [GitHub](https://github.com/aws/aws-xray-sdk-node).

## 1.1.4
* bugfix: Fixing issue where an unexpected segment on the CLS context would fail in Lambda 
## 1.1.3
* bugfix: Resolving Lambda segment information on `getSegment` rather than on `addSubsegment`.

## 1.1.2
* feature: Reintroduced global HTTP/S patcher. See the documentation for 'captureHTTPsGlobal' for details.
* feature: Added AWSXray.appendAWSWhitelist function to append to the current whitelist loaded.
* bugfix: Fixed compatibility issues with webpack in regard to custom sampling rules and AWS whitelists.
* bugfix: Fixed issue where partial subsegment streaming would throw an error on 'undefined'.
* bugfix: Fixed issue where AWS call response descriptors were attempting to be read on an error.

## 1.1.1
* feature: Added debug logs for sampling rates and matches.
* feature: Added patcher for the http.get helper function as a part of the captureHTTPs function.
* bugfix: Fixed issue where default fixed target/rate set to zero in sampling rate file would erroneously throw an error.
* bugfix: Fixed issue where url capturing for incoming requests was coded to an Express-only property.
* bugfix: Fixed issue with S3 calls where only x-amz-id-2 was captured as request ID. Added 'id_2' property to properly capture S3 request ID pairs.
* bugfix: Fixed issue where capturing a count of parameters on a parameter of an AWS call when the parameter wasn't defined would capture 'undefined'.
* bugfix: Fixed compatibility issue with webpack.
* bugfix: Fixed issue where the open socket to send segments would cause Node process to hang on attempted graceful shutdown.

## 1.1.0
* **BREAKING** change: Segment.addSDKVersions() reworked into setSDKData().
* **BREAKING** change: Segment.addServiceVersions() reworked into setServiceData().
* change: Capturing AWS and HTTP calls in manual mode now uses a param 'XRaySegment' rather than 'Segment'.  Backwards compatible, see usage examples in README.md.
* feature: Added support for capturing AWS Lambda function invocations.
* feature: Added additional data captured from NPM and process.env to segments.
* feature: Added custom namespaces for metadata. Usage: segment.addMetadata(<key>, <value>, <namespace>).
* bugfix: Fixed issue where AWS call capturing marked exceptions due to throttling as 'error'. Now marked as 'throttled'.
