
## Requirements

AWS SDK v2.7.15 or greater (if using `captureAWS` or `captureAWSClient`)
Express 4.14.0 or greater (if using Express and the associated X-Ray middleware)
MySQL 2.12.0 or greater (if using `captureMySQL`)
Postgres 6.1.0 or greater (if using `capturePostgres`)

## AWS X-Ray

The AWS X-Ray SDK automatically records information for incoming and outgoing requests and responses (via middleware), as well as local data
such as function calls, time, variables (via metadata and annotations), even EC2 instance data (via plugins).

Although the AWS X-Ray SDK was originally intended to capture request/response data on a web app, the SDK provides functionality for use cases
outside this as well. The SDK exposes the 'Segment' and 'Subsegment' objects to create your own capturing mechanisms, middleware, etc.

This package includes all other AWS X-Ray packages except `aws-xray-sdk-restify` which is still in beta.

    aws-xray-sdk-core
    aws-xray-sdk-express
    aws-xray-sdk-postgres
    aws-xray-sdk-mysql

## Setup

The core package contains the base SDK functionality.  Please see the aws-xray-sdk-core [README.md](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core/README.md) for more details.

### Support for web frameworks

* [Express](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express)
* [Restify](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/restify)(beta)
