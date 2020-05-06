# Changelog for AWS X-Ray SDK for JavaScript
<!--LATEST=3.0.1-->
<!--ENTRYINSERT-->
## 3.0.1
* change: Updated aws-xray-sdk-core to 3.0.1. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 3.0.1. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.0.1. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.0.1. No further changes.
* change: Updated aws-xray-sdk-restify to 3.0.1. No further changes.

## 3.0.0
* change: Updated aws-xray-sdk-core to 3.0.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 3.0.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.0.0. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.0.0. No further changes.
* change: Updated aws-xray-sdk-restify to 3.0.0. 
  * improvement: Brought aws-xray-sdk-restify out of beta [commit](https://github.com/aws/aws-xray-sdk-node/commit/f6e7c2e311dda848aa3915b9c0e0ad2d714745fa#diff-ca41f70ee3218f6dc7b034e823f9e485)

## 3.0.0-alpha.2
* change: Updated aws-xray-sdk-core to 3.0.0-alpha.2. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 3.0.0-alpha.2. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.0.0-alpha.2.
  * improvement: Support MySQL Timeout parameter [PR #248](https://github.com/aws/aws-xray-sdk-node/pull/248)
* change: Updated aws-xray-postgres to 3.0.0-alpha.2. No further changes.

## 3.0.0-alpha.1
* change: Updated aws-xray-sdk-core to 3.0.0-alpha.1. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 3.0.0-alpha.1. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.0.0-alpha.1. No further changes.
* change: Updated aws-xray-postgres to 3.0.0-alpha.1. No further changes.

## 2.5.0
* change: Updated aws-xray-sdk-core to 2.5.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.5.0. See aws-xray-sdk-express's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-mysql to 2.5.0.
  * improvement: Added TypeScript definitions [PR #207](https://github.com/aws/aws-xray-sdk-node/pull/207)
* change: Updated aws-xray-postgres to 2.5.0.
  * improvement: Added TypeScript definitions [PR #207](https://github.com/aws/aws-xray-sdk-node/pull/207)

## 2.4.0
* change: Updated aws-xray-sdk-core to 2.4.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.4.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.4.0. No further changes.
* change: Updated aws-xray-postgres to 2.4.0. No further changes.

## 2.3.6
* change: Updated aws-xray-sdk-core to 2.3.6. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.6. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.3.6. No further changes.
* change: Updated aws-xray-postgres to 2.3.6. No further changes.

## 2.3.5
* change: Updated aws-xray-sdk-core to 2.3.5. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.5. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.3.5.
  * improvement: Added required segment arg to sample code in docs: [PR #165](https://github.com/aws/aws-xray-sdk-node/pull/165)
* change: Updated aws-xray-postgres to 2.3.5. No further changes.

## 2.3.4
* change: Updated .eslintrc.json to enable es6 and fixed eslint errors: [PR #146](https://github.com/aws/aws-xray-sdk-node/pull/146)
* change: Updated aws-xray-sdk-core to 2.3.4. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.4. See aws-xray-sdk-express's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-mysql to 2.3.4.
  * improvement: Updated eslint dev dependency: [PR #145](https://github.com/aws/aws-xray-sdk-node/pull/145)
  * improvement: Updated .eslintrc.json to enable es6 and fixed eslint errors: [PR #146](https://github.com/aws/aws-xray-sdk-node/pull/146)
  * improvement: Updated nock,mocha,sinon dependencies to fix lodash version: [PR #153](https://github.com/aws/aws-xray-sdk-node/pull/153)
* change: Updated aws-xray-postgres to 2.3.4
  * improvement: Updated eslint dev dependency: [PR #145](https://github.com/aws/aws-xray-sdk-node/pull/145)
  * improvement: Updated .eslintrc.json to enable es6 and fixed eslint errors: [PR #146](https://github.com/aws/aws-xray-sdk-node/pull/146)
  * improvement: Updated nock,mocha,sinon dependencies to fix lodash version: [PR #153](https://github.com/aws/aws-xray-sdk-node/pull/153)

## 2.3.3
* change: Updated aws-xray-sdk-core to 2.3.3. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.3. See aws-xray-sdk-express's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-mysql to 2.3.3. No further changes.
* change: Updated aws-xray-postgres to 2.3.3. No further changes.

## 2.3.2
* change: Updated aws-xray-sdk-core to 2.3.2. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.2. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.3.2. No further changes.
  * bugfix: Fixes TypeError when checking `then` methods.
  [#PR120](https://github.com/aws/aws-xray-sdk-node/pull/120)
* change: Updated aws-xray-postgres to 2.3.2. No further changes.

## 2.3.1
* change: Updated aws-xray-sdk-core to 2.3.1. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.1. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.3.1. No further changes.
* change: Updated aws-xray-postgres to 2.3.1. No further changes.

## 2.3.0
* change: Updated aws-xray-sdk-core to 2.3.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.3.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.3.0.
  * feature: Patches connections created by a pool's `getConnection` method. 
  [#PR98](https://github.com/aws/aws-xray-sdk-node/pull/98)
  * feature: Improved promise checks when Promise implementations are mixed-and-matched.
  [#PR114](https://github.com/aws/aws-xray-sdk-node/pull/114)
* change: Updated aws-xray-postgres to 2.3.0. No further changes.

## 2.2.0
* change: Updated aws-xray-sdk-core to 2.2.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.2.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.2.0.
  * Fixes issue where passing `null` or `undefined` as the last parameter to a `query` call would throw an error. 
  [#PR81](https://github.com/aws/aws-xray-sdk-node/pull/81)
* change: Updated aws-xray-sdk-postgres to 2.2.0. Added Promise support for `pg`. [#PR64](https://github.com/aws/aws-xray-sdk-node/pull/64)

## 2.1.0
* change: Updated aws-xray-sdk-core to 2.1.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.1.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.1.0. Added Promise support on `mysql2`. [#PR62](https://github.com/aws/aws-xray-sdk-node/pull/62)
* change: Updated aws-xray-sdk-postgres to 2.1.0. Added Promise support for `pg`. [#PR64](https://github.com/aws/aws-xray-sdk-node/pull/64)

## 2.0.1
* change: Updated aws-xray-sdk-core to 2.0.1. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.0.1. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.0.1. No further changes.
* change: Updated aws-xray-sdk-postgres to 2.0.1. No further changes.

## 2.0.0
* change: Updated aws-xray-sdk-core to 2.0.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 2.0.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 2.0.0. No further changes.
* change: Updated aws-xray-sdk-postgres to 2.0.0. No further changes.

## 1.3.0
* change: Updated aws-xray-sdk-core to 1.3.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.3.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 1.3.0. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.3.0. No further changes.

## 1.2.0
* change: Updated aws-xray-sdk-core to 1.2.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.2.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 1.2.0. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.2.0. No further changes.

## 1.1.7
* change: Updated aws-xray-sdk-core to 1.1.7. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.1.7. No further changes.
* change: Updated aws-xray-sdk-mysql to 1.1.7. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.1.7. No further changes.

## 1.1.5
* The X-Ray SDK for Node.js is now an open source project. You can follow the project and submit issues and pull requests on [GitHub](https://github.com/aws/aws-xray-sdk-node).

## 1.1.4

* change: Updated aws-xray-sdk-core to 1.1.4. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.1.4. No further changes.
* change: Updated aws-xray-sdk-mysql to 1.1.4. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.1.4. No further changes.

## 1.1.3
* change: Updated aws-xray-sdk-core to 1.1.3. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.1.3. No further changes.
* change: Updated aws-xray-sdk-mysql to 1.1.3. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.1.3. No further changes.

## 1.1.2
* change: Updated aws-xray-sdk-core to 1.1.2. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.1.2. See aws-xray-sdk-express's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-mysql to 1.1.2. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.1.2. No further changes.

## 1.1.1
* change: Updated aws-xray-sdk-core to 1.1.1. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 1.1.1. See aws-xray-sdk-express's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-mysql to 1.1.1. No further changes.
* change: Updated aws-xray-sdk-postgres to 1.1.1. No further changes.

## 1.1.0
* change: Updated aws-xray-sdk-core from 1.0.0-beta to 1.1.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express from 1.0.0-beta to 1.1.0. No further changes.
* change: Updated aws-xray-sdk-mysql from 1.0.0-beta to 1.1.0. No further changes.
* change: Updated aws-xray-sdk-postgres from 1.0.0-beta to 1.1.0. No further changes.

## 1.0.6-beta
* **BREAKING** change: added a `setContextMissingStrategy` function to the `AWSXRay` module. This allows configuration of the exception behavior exhibited when trace context is not properly propagated. The behavior can be configured in code. Alternatively, the environment variable `AWS_XRAY_CONTEXT_MISSING` can be used (overrides any modes set in code). Valid values for this environment variable are currently (case insensitive) `RUNTIME_ERROR` and `LOG_ERROR`. The default behavior is changing from `LOG_ERROR` to `RUNTIME_ERROR`, i.e. by default, an exception will be thrown on missing context.
* **BREAKING** change: Renamed the capture module's exported functions `capture`, `captureAsync`, and `captureCallback` to `captureFunc`, `captureAsyncFunc`, and `captureCallbackFunc`, respectively.
* change: Changed the behavior when loading multiple plugins to set the segment origin using the latest-loaded plugin.
* change: Removed the `Subsegment` `addRemote` setter. `Subsegment` namespaces can be set directly using the `namespace` attribute.
* change: Changed the name of the `Segment`/`Subsegment` `addThrottle` method to `addThrottleFlag`.
* change: Removed the `type` parameter from the `Segment`/`Subsegment` `addError` and `close` methods.
* feature: Added `addFaultFlag` and `addErrorFlag` methods to `Segment` and `Subsegment`.
* feature: Added additional version information to the `aws.xray` segment property.
* bugfix: Fixed issue where loading multiple plugins using `XRay.config` did not set all applicable data in the segment's `aws` attribute.

## 1.0.5-beta
* change: Changed the expected sampling file format. See README for details.
* change: Removed the default file logger. You can set a custom logger via AWSXRay.setLogger().
* change: Moved the AWSXRay.setSamplingRules() function to AWSXRay.middleware.setSamplingRules().
* change: Changed various AWS DynamoDB params on the AWS param whitelist file.
* change: Removed 'paths' property on segment and subsegment cause blocks for error capturing.
* change: Changed logging max backlog files to 3 with max size of 300kB each.
* feature: Added AWSXRay.setStreamingThreshold(<number>) and partial subsegment streaming.
* feature: Added an 'x_forwarded_for' flag attribute in regard to capturing inbound http request data.
* feature: Added AWS Lambda Invoke and InvokeAsync params to the AWS param whitelist file.
* feature: Added a configuration option to set a custom logger via AWSXRay.setLogger().
* feature: Added 'error' and 'fault' flags for HTTP response statuses for outbound calls.
* feature: Added 'For Node.js' on SDK version capturing.
* bugfix: Fixed issue with throttle flag on downstream AWS calls.
* bugfix: Fixed issue where 'error' and 'fault' flags were being set improperly.
* bugfix: Fixed issue where sampling rules were not being observed.
* bugfix: Fixed issue where sampling rules validation was not checking the expected format.
* bugfix: Fixed issue where an error loading the AWS Elastic Beanstalk plugin would be improperly logged.
* bugfix: Fixed issue where calling addError and passing a string would throw an error.

## 1.0.4-beta
* change: Removed microtime dependency.
* change: Improved the detection of throttling errors from AWS services.
* change: Moved the aws.xray.sdk.version segment attribute to aws.xray.sdk_version.

## 1.0.3-beta
* bugfix: Added microtime dependency.

## 1.0.2-beta
* change: Added the AWS_XRAY_TRACING_NAME environment variable. XRAY_TRACING_NAME will be deprecated on GA release.
* change: Renamed XRAY_DEBUG_MODE environment variable to AWS_XRAY_DEBUG_MODE.
* change: Removed XRAY_TRACING_DEFAULT_NAME environment variable.
* change: Removed AWSXRay.setDefaultName(). A default name is now required via AWSXRay.express.openSegment(<defaultName>).
* change: Minimum AWS SDK version required for capturing is 2.7.15.
* feature: Added AWS_XRAY_DAEMON_ADDRESS environment variable.
* feature: Added AWSXRay.setDaemonAddress(<address>) function that accepts an IPv4 address. See README for details.
* feature: Introducing 'fixed' (default) and 'dynamic' naming modes. Enable dynamic mode via AWSXRay.middleware.enableDynamicNaming(<optionalPattern>).
* feature: Added a 'remote' attribute flag to mark errors from downstream services.
* feature: Added 'service' 'version' attribute to capture NPM module version of your application.
* feature: Added 'aws' 'sdk' version' attribute to capture AWS X-RAY SDK version.
* bugfix: Fixed broken logging statement on AWS Client patcher.
* bugfix: Changed segment emitter to keep UPD socket open instead of closing on complete.
* bugfix: Fixed issue with loading AWS Elastic Beanstalk data and origin name.
