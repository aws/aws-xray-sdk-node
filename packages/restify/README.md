
## Requirements

  AWS X-Ray SDK Core (aws-xray-sdk-core)
  Restify 4.3.0 or greater

## AWS X-Ray and Restify

The AWS X-Ray Restify package automatically records information for incoming and outgoing
requests and responses, via the 'enable' function in this package.

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the Continuation Local Storage package (CLS) and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference.

In automatic mode, you can get the current segment or subsegment at any time:
    var segment = AWSXRay.getSegment();

In manual mode, you can get the base segment off of the request object:
    var segment = req.segment;

    //If the restify context plugin is being used, it is placed under 'XRaySegment'
    var segment = req.get('XRaySegment');

## Sampling rates on routes

Sampling rates are determined by the AWS X-Ray SDK Core package, using the default
sampling file that is provided, or by overriding this with a custom sampling file.
For more information about sampling, see the aws-xray-sdk-core [README](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core/README.md).

## Dynamic and fixed naming modes

The SDK requires that a default segment name is set. If it isn't set,
an error is thrown. You can override this value via the `AWS_XRAY_TRACING_NAME`
environment variable.

    AWSXRayRestify.enable(server, 'defaultName');

The AWS X-Ray SDK Core defaults to a fixed naming mode. This means that each time the handler creates a new segment for an incoming request,
the name of that segment is set to the default name. In dynamic mode, the segment name can vary between the host header of the request or the default name.
For more information about naming modes, see the aws-xray-sdk-core [README](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core/README.md).

## Automatic mode examples

    var AWSXRayRestify = require('aws-xray-sdk-restify');
    var restify = require('restify');
    var server = restify.createServer();

    //...

    AWSXRayRestify.enable(server, 'defaultName');

    server.get('/', function (req, res) {
      var segment = AWSXRay.getSegment();

      //...

      res.send('hello');
    });

    //Error capturing is attached to the server's uncaughtException and after events (for both handled and unhandled errors)

## Manual mode examples

    var AWSXRayRestify = require('aws-xray-sdk-restify');
    var restify = require('restify');
    var server = restify.createServer();

    //...

    AWSXRayRestify.enable(server, 'defaultName');          //Required at the start of your routes

    server.get('/', function (req, res) {
      var segment = req.segment;

      //...

      res.send('hello');
    });

    //Error capturing is attached to the server's uncaughtException and after events (for both handled and unhandled errors)
