[![Build Status](https://travis-ci.org/aws/aws-xray-sdk-node.svg?branch=master)](https://travis-ci.org/aws/aws-xray-sdk-node)

# AWS X-Ray SDK for Node.js

![Screenshot of the AWS X-Ray console](/images/example_servicemap.png?raw=true)

## Installing

The AWS X-Ray SDK for Node.js is compatible with Node.js version 4 and later.
The AWS X-Ray SDK for Node.js has been tested with versions 4.x through 11.x of Node.js.
There may be issues when running on versions of Node.js newer than 11.x.

The SDK is available from NPM. For local development, install the SDK in your project directory with npm.

```
npm install aws-xray-sdk
```

Use the --save option to save the SDK as a dependency in your application's package.json.

```
npm install aws-xray-sdk --save
```

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

## Documentation

The [developer guide](https://docs.aws.amazon.com/xray/latest/devguide) provides in-depth
guidance about using the AWS X-Ray service.
The [API Reference](http://docs.aws.amazon.com/xray-sdk-for-nodejs/latest/reference/)
provides guidance for using the SDK and module-level documentation.

## Contributing

This monorepo hosts the following npm packages for the SDK:
- [aws-xray-sdk](https://www.npmjs.com/package/aws-xray-sdk)
- [aws-xray-sdk-core](https://www.npmjs.com/package/aws-xray-sdk-core)
- [aws-xray-sdk-express](https://www.npmjs.com/package/aws-xray-sdk-express)
- [aws-xray-sdk-mysql](https://www.npmjs.com/package/aws-xray-sdk-mysql)
- [aws-xray-sdk-postgres](https://www.npmjs.com/package/aws-xray-sdk-postgres)
- [aws-xray-sdk-restify](https://www.npmjs.com/package/aws-xray-sdk-restify)

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
