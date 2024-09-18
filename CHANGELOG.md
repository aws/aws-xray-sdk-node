# Changelog for AWS X-Ray SDK for JavaScript
<!--LATEST=3.10.0-->
<!--ENTRYINSERT-->
## 3.10.1
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.9.0...aws-xray-sdk-node%403.10.0)
* `aws-xray-sdk-core` updated to 3.10.1
  * Bump dependency version for body-parser, express and find-my-way
  * These dependency version changes apply to all packages
* `aws-xray-sdk-mysql` updated to 3.10.1
  *  No further changes.
* `aws-xray-sdk-express` updated to 3.10.1
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.10.1
  *  No further changes.
* `aws-xray-sdk-restify` updated to 3.10.1
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.10.1
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.10.1
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.10.1
  * No further changes.
* `aws-xray-sdk-fetch` added in 3.10.1
  *  No further changes.

## 3.10.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.9.0...aws-xray-sdk-node%403.10.0)
* `aws-xray-sdk-core` updated to 3.10.0
  * No further changes
* `aws-xray-sdk-mysql` updated to 3.10.0
  *  Prefix SQL URLs with scheme [PR #667](https://github.com/aws/aws-xray-sdk-node/pull/667)
* `aws-xray-sdk-express` updated to 3.10.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.10.0
  *  Prefix SQL URLs with scheme [PR #667](https://github.com/aws/aws-xray-sdk-node/pull/667)
* `aws-xray-sdk-restify` updated to 3.10.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.10.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.10.0
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.10.0
  * No further changes.
* `aws-xray-sdk-fetch` added in 3.10.0
  *  Pass dispatcher options to global fetch [PR #653](https://github.com/aws/aws-xray-sdk-node/pull/653)

## 3.9.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.8.0...aws-xray-sdk-node%403.9.0)
* `aws-xray-sdk-core` updated to 3.9.0
  * Feature: Lambda PassThrough trace header support [PR #660](https://github.com/aws/aws-xray-sdk-node/pull/660)
* `aws-xray-sdk-mysql` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-express` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.9.0
  * No further changes.
* `aws-xray-sdk-fetch` added in 3.9.0
  * No further changes.

## 3.8.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.7.0...aws-xray-sdk-node%403.8.0)
* `aws-xray-sdk-core` updated to 3.8.0
  * Fix: Revert #651 [Lambda] Replace Facade with No-Op if trace header is missing data [PR #657](https://github.com/aws/aws-xray-sdk-node/pull/657)
* `aws-xray-sdk-mysql` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-express` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.8.0
  * No further changes.
* `aws-xray-sdk-fetch` added in 3.8.0
  * No further changes.

## 3.7.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.6.0...aws-xray-sdk-node%403.7.0)
* `aws-xray-sdk-core` updated to 3.7.0
  * Feature: Replace Facade segment with No-Op if trace header is missing data in AWS Lambda PassThrough mode [PR #651](https://github.com/aws/aws-xray-sdk-node/pull/651)
  * Fix: TraceId timestamp supports string starts with '0' [PR #641](https://github.com/aws/aws-xray-sdk-node/pull/641)
* `aws-xray-sdk-mysql` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-express` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.7.0
  * No further changes.
* `aws-xray-sdk-fetch` added in 3.7.0
  * Fix: fix subsegment callback error parameter type [PR #644](https://github.com/aws/aws-xray-sdk-node/pull/644)

## 3.6.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.5.4...aws-xray-sdk-node%403.6.0)
* `aws-xray-sdk-core` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-mysql` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-express` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.6.0
  * No further changes.
* `aws-xray-sdk-fetch` added in 3.6.0
  * Feature: Added aws-xray-sdk-fetch package as an sdk_contrib instrumentation [PR #590](https://github.com/aws/aws-xray-sdk-node/pull/590)

## 3.5.4
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.5.3...aws-xray-sdk-node%403.5.4)
* `aws-xray-sdk-core` updated to 3.5.4
  * change: Add export for resolveManualSegmentParams to AWSXRay [PR #628](https://github.com/aws/aws-xray-sdk-node/pull/628)
* `aws-xray-sdk-mysql` updated to 3.5.4
  * No further changes.
* `aws-xray-sdk-express` updated to 3.5.4
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.5.4
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.5.4
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.5.4
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.5.4
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.5.4
  * No further changes.

## 3.5.3
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.5.2...aws-xray-sdk-node%403.5.3)
* `aws-xray-sdk-core` updated to 3.5.3
  * fix: serialize bigint in metadata to string [PR #619](https://github.com/aws/aws-xray-sdk-node/pull/619)
  * fix: Update deprecated @aws-sdk package dependencies [PR #621](https://github.com/aws/aws-xray-sdk-node/pull/621)
* `aws-xray-sdk-mysql` updated to 3.5.3
  * No further changes.
* `aws-xray-sdk-express` updated to 3.5.3
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.5.3
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.5.3
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.5.3
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.5.3
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.5.3
  * No further changes.

## 3.5.2
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.5.1...aws-xray-sdk-node%403.5.2)
* `aws-xray-sdk-core` updated to 3.5.2
  * fix: capture command data for SDK v3 clients [PR #611](https://github.com/aws/aws-xray-sdk-node/pull/611)
  * fix: memory leaks caused by cls-hooked [PR #595](https://github.com/aws/aws-xray-sdk-node/pull/595)
* `aws-xray-sdk-mysql` updated to 3.5.2
  * No further changes.
* `aws-xray-sdk-express` updated to 3.5.2
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.5.2
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.5.2
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.5.2
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.5.2
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.5.2
  * No further changes.

## 3.5.1
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.5.0...aws-xray-sdk-node%403.5.1)
* `aws-xray-sdk-core` updated to 3.5.1
  * fix: Add TS declaration file for SegmentEmitter [PR #586](https://github.com/aws/aws-xray-sdk-node/pull/586)
  * fix: Incorrect data variable usage + missing data injection in AWS v3 clients [PR #596](https://github.com/aws/aws-xray-sdk-node/pull/596)
  * fix: Update semver dependency [PR #598](https://github.com/aws/aws-xray-sdk-node/pull/598)
  * fix: Override transitive semver dependency [PR #604](https://github.com/aws/aws-xray-sdk-node/pull/604)
    * fix improvement: Better dependency override + Npm 8 in workflows [PR #607](https://github.com/aws/aws-xray-sdk-node/pull/607)
* `aws-xray-sdk-mysql` updated to 3.5.1
  * No further changes.
* `aws-xray-sdk-express` updated to 3.5.1
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.5.1
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.5.1
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.5.1
  * fix: Fix typo in fastify logger type declaration [PR #589](https://github.com/aws/aws-xray-sdk-node/pull/589)
* `aws-xray-sdk-koa2` updated to 3.5.1
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.5.1
  * No further changes.

## 3.5.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.4.1...aws-xray-sdk-node%403.5.0)
* `aws-xray-sdk-core` updated to 3.5.0
  * change: Updated type declaration of captureAWSv3Client to fix TS errors [PR #575](https://github.com/aws/aws-xray-sdk-node/pull/575)
* `aws-xray-sdk-mysql` updated to 3.5.0
  * change: Add support for including sql query in sql subsegment for MySQL [PR #564](https://github.com/aws/aws-xray-sdk-node/pull/564)
* `aws-xray-sdk-express` updated to 3.5.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.5.0
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.5.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.5.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.5.0
  * No further changes. 
* `aws-xray-sdk-hapi` updated to 3.5.0
  * No further changes.

## 3.4.1 
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.4.0...aws-xray-sdk-node%403.4.1)
* `aws-xray-sdk-core` updated to 3.4.1
  * change: Propagate additional trace data into AWS requests on Lambda [PR #549](https://github.com/aws/aws-xray-sdk-node/pull/549)
  * change: Modified context missing strategy default to log error [PR #550](https://github.com/aws/aws-xray-sdk-node/pull/550)
* `aws-xray-sdk-mysql` updated to 3.4.1
  * No further changes. 
* `aws-xray-sdk-express` updated to 3.4.1
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.4.1
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.4.1
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.4.1
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.4.1
  * No further changes. 
* `aws-xray-sdk-hapi` updated to 3.4.1
  * No further changes.

## 3.4.0
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.3.8...aws-xray-sdk-node%403.4.0)
* `aws-xray-sdk-core` updated to 3.4.0
  * change: Allow list TopicArn for SNS PublishBatch [PR #539](https://github.com/aws/aws-xray-sdk-node/pull/539)
  * change: Oversampling Mitigation [PR #541](https://github.com/aws/aws-xray-sdk-node/pull/541)
* `aws-xray-sdk-mysql` updated to 3.4.0
  * No further changes. 
* `aws-xray-sdk-express` updated to 3.4.0
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.4.0
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.4.0
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.4.0
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.4.0
  * No further changes. 
* `aws-xray-sdk-hapi` updated to 3.4.0
  * No further changes.

## 3.3.8
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.3.7...aws-xray-sdk-node%403.3.8)
* `aws-xray-sdk-core` updated to 3.3.8
  * fix: update lerna package to fix security vulnerabilities [PR #536](https://github.com/aws/aws-xray-sdk-node/pull/536)
* `aws-xray-sdk-mysql` updated to 3.3.8
  * No further changes. 
* `aws-xray-sdk-express` updated to 3.3.8
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.3.8
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.3.8
  * No further changes.
* `aws-xray-sdk-fastify` updated to 3.3.8
  * improvement: fastify SDK contrib [PR #523](https://github.com/aws/aws-xray-sdk-node/pull/523)
* `aws-xray-sdk-koa2` updated to 3.3.8
  * No further changes. 
* `aws-xray-sdk-hapi` updated to 3.3.8
  * No further changes.
## 3.3.7
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.3.6...aws-xray-sdk-node%403.3.7)
* `aws-xray-sdk-core` updated to 3.3.7
  * fix: Stop throwing unnecessary errors with adding annotations, metadata, errors [PR #467](https://github.com/aws/aws-xray-sdk-node/pull/467)
  * fix: Fix TS declaration of TraceId to match definition [PR #520](https://github.com/aws/aws-xray-sdk-node/pull/520)
  * fix: Fix prototype pollution issue [PR #529](https://github.com/aws/aws-xray-sdk-node/pull/529)
* `aws-xray-sdk-mysql` updated to 3.3.7
  * No further changes. 
* `aws-xray-sdk-express` updated to 3.3.7
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.3.7
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.3.7
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.3.7
  * fix: Change Koa openSegment middleware declaration return type to match expected Koa.Middleware type [PR #525](https://github.com/aws/aws-xray-sdk-node/pull/525)
* `aws-xray-sdk-hapi` updated to 3.3.7
  * No further changes.

## 3.3.6
View [the latest changes](https://github.com/aws/aws-xray-sdk-node/compare/aws-xray-sdk-node%403.3.5...aws-xray-sdk-node%403.3.6)
* `aws-xray-sdk-core` updated to 3.3.6
  * fix: Check `serviceName` is null even if it should never be [PR #457](https://github.com/aws/aws-xray-sdk-node/pull/457)
  * fix: Populate vars to avoid `unshift undefined` error [PR #508](https://github.com/aws/aws-xray-sdk-node/pull/508)
* `aws-xray-sdk-mysql` updated to 3.3.6
  * fix: avoid fake .then() method on mysql2 Query class [PR #501](https://github.com/aws/aws-xray-sdk-node/pull/501)
* `aws-xray-sdk-express` updated to 3.3.6
  * No further changes.
* `aws-xray-sdk-postgres` updated to 3.3.6
  * No further changes.
* `aws-xray-sdk-restify` updated to 3.3.6
  * No further changes.
* `aws-xray-sdk-koa2` updated to 3.3.6
  * No further changes.
* `aws-xray-sdk-hapi` updated to 3.3.6
  * No further changes.

## 3.3.5
* change: Updated aws-xray-sdk-core to 3.3.5.
  * bugfix: added ids to exception objects [PR #475](https://github.com/aws/aws-xray-sdk-node/pull/475)
* change: Updated aws-xray-sdk-express to 3.3.5. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.3.5. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.3.5. No further changes.
* change: Updated aws-xray-sdk-restify to 3.3.5. No further changes.
* change: Updated aws-xray-sdk-koa2 to 3.3.5. No further changes.
* change: Updated aws-xray-sdk-hapi to 3.3.5. No further changes.

## 3.3.4
* change: Updated aws-xray-sdk-core to 3.3.4.
  * bugfix: Parse hostname from options instead of headers [PR #430](https://github.com/aws/aws-xray-sdk-node/pull/430)
  * bugfix: Fix crash when http/https libraries use getters [PR #434](https://github.com/aws/aws-xray-sdk-node/pull/434)
  * bugfix: Lowercase AWS SDK v3 service names [PR #444](https://github.com/aws/aws-xray-sdk-node/pull/444)
  * bugfix: Add namespace to subsegment type [PR #470](https://github.com/aws/aws-xray-sdk-node/pull/470)
* change: Updated aws-xray-sdk-express to 3.3.4. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.3.4. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.3.4. No further changes.
* change: Updated aws-xray-sdk-restify to 3.3.4. No further changes.
* change: Updated aws-xray-sdk-koa2 to 3.3.4. No further changes.
* change: Updated aws-xray-sdk-hapi to 3.3.4. No further changes.

## 3.3.3
* change: Updated aws-xray-sdk-core to 3.3.3.
  * bugfix: corrected require paths that did not reference dist [PR #428](https://github.com/aws/aws-xray-sdk-node/pull/428)
* change: Updated aws-xray-sdk-express to 3.3.3. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.3.3. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.3.3. No further changes.
* change: Updated aws-xray-sdk-restify to 3.3.3. No further changes.
* change: Updated aws-xray-sdk-koa2 to 3.3.3. No further changes.
* change: Updated aws-xray-sdk-hapi to 3.3.3. No further changes.

## 3.3.2
* change: Updated aws-xray-sdk-core to 3.3.2.
  * bugfix: coerce content_length and status to ints [PR #402](https://github.com/aws/aws-xray-sdk-node/pull/402)
  * bugfix: re-implement AWS SDK V3 instrumentation with middleware [PR #416](https://github.com/aws/aws-xray-sdk-node/pull/416)
  * bugfix: fix TypeScript publishing mechanism [PR #417](https://github.com/aws/aws-xray-sdk-node/pull/417)
* change: Updated aws-xray-sdk-express to 3.3.2. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.3.2. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.3.2. No further changes.
* change: Updated aws-xray-sdk-restify to 3.3.2. No further changes.
* change: Updated aws-xray-sdk-koa2 to 3.3.2. No further changes.
* change: Updated aws-xray-sdk-hapi to 3.3.2. No further changes.

## 3.3.1
* change: Updated aws-xray-sdk-core to 3.3.1.
  * rollback: reverted instrumentation for AWS SDK V3 clients [PR #412](https://github.com/aws/aws-xray-sdk-node/pull/412)
* change: Updated aws-xray-sdk-express to 3.3.1. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.3.1. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.3.1. No further changes.
* change: Updated aws-xray-sdk-restify to 3.3.1. No further changes.
* change: Updated aws-xray-sdk-koa2 to 3.3.1. No further changes.
* change: Updated aws-xray-sdk-hapi to 3.3.1. No further changes.

## 3.3.0
* change: Updated aws-xray-sdk-core to 3.3.0.
  * improvement: add IGNORE_ERROR context missing strategy [PR #345](https://github.com/aws/aws-xray-sdk-node/pull/345)
  * improvement: also instrument Promise.catch in promise patcher [PR #367](https://github.com/aws/aws-xray-sdk-node/pull/367)
  * improvement: adds AWS SDK V3 instrumentation [PR #386](https://github.com/aws/aws-xray-sdk-node/pull/386)
  * fix: add end_time to segment type def [PR #350](https://github.com/aws/aws-xray-sdk-node/pull/350)
  * fix: fix validation issues in service connector [PR #339](https://github.com/aws/aws-xray-sdk-node/pull/339)
  * fix: add downstreamXRayEnabled to type defs [PR #357](https://github.com/aws/aws-xray-sdk-node/pull/357)
  * fix: ensure trace IDs are never `null` in Lambda [PR #361](https://github.com/aws/aws-xray-sdk-node/pull/361)
  * fix: make setting context modes idempotent [PR #371](https://github.com/aws/aws-xray-sdk-node/pull/371)
  * fix: replace deprecated `url.parse` with WHATWG URLs [PR #373](https://github.com/aws/aws-xray-sdk-node/pull/373)
  * fix: make capture promise idempotent [PR #400](https://github.com/aws/aws-xray-sdk-node/pull/400)
* change: Updated aws-xray-sdk-express to 3.3.0.
  * fix: fixed a bug causing segments to be closed twice in Express [PR #362](https://github.com/aws/aws-xray-sdk-node/pull/362) 
* change: Updated aws-xray-sdk-mysql to 3.3.0.
  * fix: fixes mysql query config object being changed by instrumentation [PR #340](https://github.com/aws/aws-xray-sdk-node/pull/340)
  * fix: fixes argument parsing to be compatible with mysql2 [PR #381](https://github.com/aws/aws-xray-sdk-node/pull/381)
* change: Updated aws-xray-sdk-postgres to 3.3.0.
  * improvement: add opt-in ability to capture SQL query [PR #390](https://github.com/aws/aws-xray-sdk-node/pull/390)
  * fix: support queryConfig object in postgres patcher [PR #337](https://github.com/aws/aws-xray-sdk-node/pull/337)
  * fix: prevent instrumentation from stripping config attributes [PR #363](https://github.com/aws/aws-xray-sdk-node/pull/363)
* change: Updated aws-xray-sdk-restify to 3.3.0. No further changes.
* change: Updated aws-xray-sdk-koa2 to 3.3.0. No further changes.
* change: Updated aws-xray-sdk-hapi to 3.3.0. No further changes.

## 3.2.0
* change: Updated aws-xray-sdk-core to 3.2.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 3.2.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.2.0.
  * improvement: Added support for promises returned by mysql2 queries [PR #328](https://github.com/aws/aws-xray-sdk-node/pull/328) 
* change: Updated aws-xray-sdk-postgres to 3.2.0. No further changes.
* change: Updated aws-xray-sdk-restify to 3.2.0. No further changes.
* change: Added the aws-xray-sdk-koa2 package as an sdk_contrib middleware [PR #317](https://github.com/aws/aws-xray-sdk-node/pull/317)
* change: Added the aws-xray-sdk-hapi package as an sdk_contrib middleware [PR #323](https://github.com/aws/aws-xray-sdk-node/pull/323)

## 3.1.0
* change: Updated aws-xray-sdk-core to 3.1.0. See aws-xray-sdk-core's CHANGELOG.md for package changes.
* change: Updated aws-xray-sdk-express to 3.1.0. No further changes.
* change: Updated aws-xray-sdk-mysql to 3.1.0. No further changes.
* change: Updated aws-xray-sdk-postgres to 3.1.0. No further changes.
* change: Updated aws-xray-sdk-restify to 3.1.0. No further changes.

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
