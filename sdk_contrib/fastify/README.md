# fastify-xray

A Fastify plugin to log requests and subsegments through AWSXray.

## Setup

The plugin relies on the AWS credentials being set before being registered, or it will pull them from
`~/.aws/credentials` as per the SDK default.

For more details on using X-Ray, see the [docs](https://docs.aws.amazon.com/xray-sdk-for-nodejs/latest/reference)

## Usage

Simply register as a normal Fastify plugin

```js
const AWSXRay = require('aws-xray-sdk');

await server.register(require('aws-xray-sdk-fastify'), {
  segmentName: 'test segment',
  captureAWS: true,
  plugins: [AWSXRay.plugins.ECSPlugin],
});
```

In automatic mode, you can access the X-Ray segment at any time via the AWSXRay SDK:

```js
const AWSXRay = require('aws-xray-sdk-core');

const segment = AWSXRay.getSegment();
segment.addAnnotation('hitController', 'true');
```

In manual mode, you can access the current X-Ray segment from the request object:

```js
server.route({
  method: 'GET',
  path: '/items',
  handler: async (request, reply) => {
    const segment = request.segment;
    segment.addAnnotation('hitController', 'true');

    return {};
  },
});
```

### Options

- `segmentName` Segment name to use in place of default segment name generator (**required**)
- `automaticMode` Specifies that X-Ray automatic mode is in use (default true)
- `plugins` An array of AWS plugins to use (i.e. `[AWSXRay.plugins.EC2Plugin]`)
- `captureAWS` Enables AWS X-Ray to capture AWS calls. This requires having `aws-sdk` installed as a peer dependency
- `captureHTTP` Enables AWS X-Ray to capture all http calls
- `capturePromises` Enables AWS X-Ray to capture all promises
- `logger` Bind AWS X-Ray to compatible logging interface `({ trace, debug, info })`

## Sample App

A naive Fastify server with X-Ray enabled is available in the "sample" directory.
The sample can be started from the sdk_contrib/fastify directory with: `npm run sample`

Once running, a "hello world" GET endpoint will be available at `http://localhost:3010/`

The sample will run but throw errors connecting to X-Ray if a local X-Ray daemon is not running.

For more information on running the XRay daemon locally:
https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-local.html

## Thanks

Based on the hard work @[AWS X-Ray Express Middleware](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express) and heavily inspired by [X-Ray Hapi](https://github.com/aws/aws-xray-sdk-node/tree/master/sdk_contrib/hapi)

## Contributors

- [Jorge Vargas](https://github.com/jorgevrgs)
