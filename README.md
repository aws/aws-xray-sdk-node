![Continuous Build](https://github.com/aws/aws-xray-sdk-node/workflows/Node.js%20SDK%20Continuous%20Build/badge.svg)

# AWS X-Ray SDK for Node.js

![Screenshot of the AWS X-Ray console](/images/example_servicemap.png?raw=true)

## Installing

The AWS X-Ray SDK for Node.js is compatible with Node.js version 10.x and later.
There may be issues when running on the latest odd-numbered release of Node.js.

The latest stable version of the SDK is available from NPM. For local development, install the SDK in your project directory with npm.

```
npm install aws-xray-sdk
```

Use the --save option to save the SDK as a dependency in your application's `package.json`.

```
npm install aws-xray-sdk --save
```

## Documentation

This repository hosts all the packages we publish, which each have their own README. The [Core package README](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core) covers all basic use cases of the main X-Ray SDK, including its use in Lambda.
The [developer guide](https://docs.aws.amazon.com/xray/latest/devguide) provides in-depth
guidance about using the AWS X-Ray service and SDKs.
The [API Reference](http://docs.aws.amazon.com/xray-sdk-for-nodejs/latest/reference/)
provides guidance for using this SDK and module-level documentation.

[CHANGELOG.md](https://github.com/aws/aws-xray-sdk-node/blob/master/packages/full_sdk/CHANGELOG.md)

## Sample App

To get started with a functional web application instrumented with the X-Ray SDK, check out our [sample app](https://github.com/aws-samples/aws-xray-sdk-node-sample).

## Getting Help

Use the following community resources for getting help with the SDK. We use the GitHub
issues for tracking bugs and feature requests.

* Ask a question in the [AWS X-Ray Forum](https://forums.aws.amazon.com/forum.jspa?forumID=241&start=0).
* Open a support ticket with [AWS Support](http://docs.aws.amazon.com/awssupport/latest/user/getting-started.html).
* If you think you may have found a bug, open an [issue](https://github.com/aws/aws-xray-sdk-node/issues/new).

## Opening Issues

If you encounter a bug with the AWS X-Ray SDK for Node.js, we want to hear about
it. Before opening a new issue, search the [existing issues](https://github.com/aws/aws-xray-sdk-node/issues)
to see if others are also experiencing the issue. Include the version of the AWS X-Ray
SDK for Node.js, Node.js runtime, and other dependencies if applicable. In addition, 
include the repro case when appropriate.

The GitHub issues are intended for bug reports and feature requests. For help and
questions about using the AWS X-Ray SDK for Node.js, use the resources listed
in the [Getting Help](https://github.com/aws/aws-xray-sdk-node#getting-help) section. Keeping the list of open issues lean helps us respond in a timely manner.

## Contributing

We support and accept PRs from the community.

This monorepo hosts the following npm packages for the SDK:
- [aws-xray-sdk](https://www.npmjs.com/package/aws-xray-sdk)
- [aws-xray-sdk-core](https://www.npmjs.com/package/aws-xray-sdk-core)
- [aws-xray-sdk-express](https://www.npmjs.com/package/aws-xray-sdk-express)
- [aws-xray-sdk-mysql](https://www.npmjs.com/package/aws-xray-sdk-mysql)
- [aws-xray-sdk-postgres](https://www.npmjs.com/package/aws-xray-sdk-postgres)
- [aws-xray-sdk-restify](https://www.npmjs.com/package/aws-xray-sdk-restify)
- [Community contributed packages](https://github.com/aws/aws-xray-sdk-node/tree/master/sdk_contrib)

## Community contributions for new Middleware
If you'd like to add support for a new web framework by writing middleware for X-Ray, 
please do so by creating a new package within the `sdk_contrib` 
[directory](https://github.com/aws/aws-xray-sdk-node/tree/master/sdk_contrib).
We are not accepting pull requests for first-party packages at this time, 
but will be more than happy to host them as community contributions. This means that AWS will:

- Host them in this repository
- Publish them to NPM
- Consider them the officially recommended way of using X-Ray with that framework
- Review & merge pull requests made against them by the community
- Allow issues related to them on this repo for visibility to the community

AWS will not:

- Provide first party support through AWS Forums, AWS customer support, etc for things like questions & debugging help
- Actively develop on them (e.g. if we add a feature to the Express middleware, it will not necessarily be added to middleware in `sdk_contrib`)

## Testing from Source

This repo uses [Lerna](https://lernajs.io) to manage multiple packages. To install Lerna:
```
npm install lerna
```
To install devDependencies and peerDependencies for all packages:
```
lerna bootstrap --hoist
```
To run tests for all packages:
```
lerna run test
```
or go to each package and run `npm test` as usual.

## License

The AWS X-Ray SDK for Node.js is licensed under the Apache 2.0 License. See LICENSE and NOTICE.txt for more information.
