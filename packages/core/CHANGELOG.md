# Changelog for AWS X-Ray Core SDK for JavaScript
<!--LATEST=3.0.1-->
<!--ENTRYINSERT-->
## 3.0.1
* bugfix: Gracefully handle invalid sampling API responses [#ISSUE285](https://github.com/aws/aws-xray-sdk-node/issues/285)

## 3.0.0
* **BREAKING** change: Releasing all changes in 3.0.0-alpha.1 and 3.0.0-alpha.2 as stable. See below changelog entries. [#ISSUE157](https://github.com/aws/aws-xray-sdk-node/issues/157)
* improvement: Deprecated support for Node 8 [#PR 273](https://github.com/aws/aws-xray-sdk-node/pull/273)
* bugfix: Catch errors on requests to daemon [#ISSUE267](https://github.com/aws/aws-xray-sdk-node/issues/267)
* bugfix: Correct AWS patcher TS defitnitions [#ISSUE276](https://github.com/aws/aws-xray-sdk-node/issues/276)

## 3.0.0-alpha.2
* **BREAKING** change: Removed dependency on the aws-sdk, including all dependent TS definitions [PR #255](https://github.com/aws/aws-xray-sdk-node/pull/255)
* improvement: Support Node 10 syntax for `http.request` [PR #247](https://github.com/aws/aws-xray-sdk-node/pull/247)
* bugfix: Disable centralized sampling in Lambda [#ISSUE217](https://github.com/aws/aws-xray-sdk-node/issues/217)
* bugfix: Allow lerna to bump version number of top-level package.json [PR #254](https://github.com/aws/aws-xray-sdk-node/pull/254)
* bugfix: Add missing subsegment fields [PR #249](https://github.com/aws/aws-xray-sdk-node/pull/249)
* bugfix: Remove query string from URL field [#ISSUE246](https://github.com/aws/aws-xray-sdk-node/issues/246)
* bugfix: `unref` sockets in `segment_emitter.js` [#ISSUE241](https://github.com/aws/aws-xray-sdk-node/issues/241)
* bugfix: Swap out `continuation-local-storage` types for `cls-hooked` types [PR #242](https://github.com/aws/aws-xray-sdk-node/pull/242)
* bugfix: Stopped throwing context missing errors for Centralized sampling with `captureHTTPsGlobal` [#ISSUE161](https://github.com/aws/aws-xray-sdk-node/issues/161)
* bugfix: Fixed `.setDaemonAddress` API not propagating address to `service_connector` [#ISSUE233](https://github.com/aws/aws-xray-sdk-node/issues/233)
* bugfix: Removed TS race condition involving AWS SDK type definition [#ISSUE253](https://github.com/aws/aws-xray-sdk-node/issues/253)


## 3.0.0-alpha.1
* **BREAKING** change: Merged `2.x` branch into `master`, breaking node v4 [PR #226](https://github.com/aws/aws-xray-sdk-node/pull/226)
* **BREAKING** change: Officially deprecated support for node 4 and 6 [PR #228](https://github.com/aws/aws-xray-sdk-node/pull/228)
* **BREAKING** change: Removed `winston` dependency, which could impact `getLogger` API [PR #190](https://github.com/aws/aws-xray-sdk-node/pull/190)
* improvement: Replaced `continuation-local-storage` with `cls-hooked` [PR #227](https://github.com/aws/aws-xray-sdk-node/pull/227)
* improvement: Whitelisted new SageMaker operation [PR #211](https://github.com/aws/aws-xray-sdk-node/pull/211)
* improvement: Removed dependency on `date-fns` [PR #229](https://github.com/aws/aws-xray-sdk-node/pull/229)
* bugfix: Make resolve segment argument optional [PR #216](https://github.com/aws/aws-xray-sdk-node/pull/216)
* bugfix: Remove unused Lambda handshake file [PR #221](https://github.com/aws/aws-xray-sdk-node/pull/221)
* bugfix: Replace `Date.getTime` with `Date.Now` [PR #230](https://github.com/aws/aws-xray-sdk-node/pull/230)


## 2.5.0
* improvement: Add setUser function to segment object [PR #206](https://github.com/aws/aws-xray-sdk-node/pull/206)
* improvement: Add TypeScript definitions for entire SDK [PR #207](https://github.com/aws/aws-xray-sdk-node/pull/207)

## 2.4.0
* bugfix: Lazily create socket emitter to prevent Jest tests from failing due to open sockets [#ISSUE142](https://github.com/aws/aws-xray-sdk-node/issues/142)
* bugfix: Resolve one critical dependency from dynamic use of require when bundling w/ Webpack [#ISSUE103](https://github.com/aws/aws-xray-sdk-node/issues/103)
* bugfix: Use our safer, contextUtils version of getNamespace instead of cls.getNamespace [#ISSUE183](https://github.com/aws/aws-xray-sdk-node/issues/183)
* improvement: Added AWS_XRAY_LOG_LEVEL environment var to automatically emit SDK logs of given level [PR #172](https://github.com/aws/aws-xray-sdk-node/pull/172)
* improvement: Removes lodash as a dependency [PR #123](https://github.com/aws/aws-xray-sdk-node/pull/123)

## 2.3.6
* bugfix: Fixed lambda logging bug causing all debug messages to be logged for lambda customers [#ISSUE176](https://github.com/aws/aws-xray-sdk-node/issues/176) 

## 2.3.5
* bugfix: Updated Lodash dependency and other dev-dependencies pulling in lower lodash versions [#ISSUE166](https://github.com/aws/aws-xray-sdk-node/issues/166) 
* bugfix: Display debug-level logging in CW logs when debug mode enabled [PR #151](https://github.com/aws/aws-xray-sdk-node/pull/151)

## 2.3.4
* improvement: Updated eslint dev dependency: [PR #145](https://github.com/aws/aws-xray-sdk-node/pull/145)
* improvement: Updated .eslintrc.json to enable es6 and fixed eslint errors: [PR #146](https://github.com/aws/aws-xray-sdk-node/pull/146)
* improvement: Updated nock,mocha dependencies to fix lodash version: [PR #153](https://github.com/aws/aws-xray-sdk-node/pull/153)

## 2.3.3
* bugfix: adds workaround for missing cls namespace when cls-hooked imported. [#PR126](https://github.com/aws/aws-xray-sdk-node/pull/126)
* bugfix: no longer creates pending subsegments for AWS presigned url operations. [#PR130](https://github.com/aws/aws-xray-sdk-node/pull/130)

## 2.3.2
* bugfix: Avoid logging error message twice and comply to winston v3 signature. [#PR108](https://github.com/aws/aws-xray-sdk-node/pull/108)

## 2.3.1
* bugfix: Reverts removal of `lodash`.

## 2.3.0
* improvement: Removes dependency on `lodash`. [PR 99](https://github.com/aws/aws-xray-sdk-node/pull/99)
* bugfix: Fixes an issue where xray calls made for centralized sampling were being traced. [PR 102](https://github.com/aws/aws-xray-sdk-node/pull/102)

## 2.2.0
* improvement: The `aws-xray-sdk-core` package now imports the AWS X-Ray service client directly, resulting in smaller bundle sizes. [#PR73](https://github.com/aws/aws-xray-sdk-node/pull/73)
* bugfix: Fixes an issue where setting a sampling rule to have a fixed rate of 0 would fail to be honored. [#PR79](https://github.com/aws/aws-xray-sdk-node/pull/79)
* improvement: Removes the upper-bound on supported node.js versions. [#PR89](https://github.com/aws/aws-xray-sdk-node/pull/89)

## 2.1.0
* bugfix: Fixed an undefined method in `DaemonConfig`. [#ISSUE52](https://github.com/aws/aws-xray-sdk-node/issues/52)
* bugfix: Fixed an issue in transforming sampling rule definition file from v1 to v2. [#PR70](https://github.com/aws/aws-xray-sdk-node/pull/70)
* bugfix: Fixed a type safety issue when processing malformed trace header. [#PR69](https://github.com/aws/aws-xray-sdk-node/pull/69)

## 2.0.1
* bugfix: Added a missing commit in the previous release for [#ISSUE2](https://github.com/aws/aws-xray-sdk-node/issues/2).
* bugfix: Unref poller timers to avoid keeping node.js alive. [#PR56](https://github.com/aws/aws-xray-sdk-node/pull/56)

## 2.0.0
### Breaking Changes
* The default sampler now launches background tasks to poll sampling rules from X-Ray backend. See more details here: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-configuration.html#xray-sdk-nodejs-configuration-sampling.
* `shouldSample` method now takes an object containing rule matching information and returns the rule name if sampled based on a service rule.
* `Sampler` renamed to `LocalReservoir` to reflect the default sampling strategy change.
* `SamplingRules` renamed to `LocalSampler` to reflect the default sampling strategy change.

### New
* feature: Environment variable `AWS_XRAY_DAEMON_ADDRESS` now takes an additional notation in `tcp:127.0.0.1:2000 udp:127.0.0.2:2001` to set TCP and UDP destination separately. By default it assumes a X-Ray daemon listening to both UDP and TCP traffic on `127.0.0.1:2000`.
* improvement: Winston has been updated to 2.4.4 to reduce bundle size. [#PR51](https://github.com/aws/aws-xray-sdk-node/pull/51)
* bugfix: Set callback to undefined in mysql capture. [#PR47](https://github.com/aws/aws-xray-sdk-node/pull/47)
* bugfix: Address an issue where a log message cannot be suppressed by user. [#ISSUE2](https://github.com/aws/aws-xray-sdk-node/issues/2)

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
