# Changelog for AWS X-Ray SDK Express for JavaScript
<!--LATEST=2.3.3-->
<!--ENTRYINSERT-->
## 2.3.3
* bugfix(express): express middleware closes segments when client request cancelled. [PR#128](https://github.com/aws/aws-xray-sdk-node/pull/128)

## 1.1.5
* The X-Ray SDK for Node.js is now an open source project. You can follow the project and submit issues and pull requests on [GitHub](https://github.com/aws/aws-xray-sdk-node).

## 1.1.2
* bugfix: Changed behavior on a http status code 429. Segment should have been marked as 'throttle' and 'error'.

## 1.1.1
* feature: Added debug logs for opening and closing segments.
