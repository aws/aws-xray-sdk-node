# Changelog for AWS X-Ray SDK Express for JavaScript
<!--LATEST=3.0.1-->
<!--ENTRYINSERT-->
## 2.5.0
* improvement: Added TypeScript definitions [PR #207](https://github.com/aws/aws-xray-sdk-node/pull/207)

## 2.3.4
* improvement: Updated eslint dev dependency: [PR #145](https://github.com/aws/aws-xray-sdk-node/pull/145)
* improvement: Updated .eslintrc.json to enable es6 and fixed eslint errors: [PR #146](https://github.com/aws/aws-xray-sdk-node/pull/146)
* improvement: Updated nock,mocha,sinon dependencies to fix lodash version: [PR #153](https://github.com/aws/aws-xray-sdk-node/pull/153)

## 2.3.3
* bugfix(express): express middleware closes segments when client request cancelled. [PR#128](https://github.com/aws/aws-xray-sdk-node/pull/128)

## 1.1.5
* The X-Ray SDK for Node.js is now an open source project. You can follow the project and submit issues and pull requests on [GitHub](https://github.com/aws/aws-xray-sdk-node).

## 1.1.2
* bugfix: Changed behavior on a http status code 429. Segment should have been marked as 'throttle' and 'error'.

## 1.1.1
* feature: Added debug logs for opening and closing segments.
