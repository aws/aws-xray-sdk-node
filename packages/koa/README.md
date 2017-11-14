
## Requirements

  AWS X-Ray SDK Core (aws-xray-sdk-core)
  Express 4.14.0 or greater

## AWS X-Ray and Express

The AWS X-Ray Express package automatically records information for incoming and outgoing
requests and responses, via the middleware functions in this package.

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the Continuation Local Storage package (CLS) and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference.

In automatic mode, you can get the current segment/subsegment at any time:
    var segment = AWSXRay.getSegment();

In manual mode, you can get the base segment off of the request object:
    var segment = req.segment;

## Sampling rates on routes

Sampling rates are determined by the `aws-xray-sdk-core` package, using the default
sampling file that is provided, or by overriding this with a custom sampling file.
For more information on sampling, see aws-xray-sdk-core [README](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core/README.md).

## Dynamic and fixed naming modes

The SDK requires that a default segment name is set when using middleware.
If it isn't set, an error is thrown. You can override this value via the `AWS_XRAY_TRACING_NAME`
environment variable.

    app.use(xrayExpress.openSegment('defaultName'));

The AWS X-Ray SDK Core defaults to a fixed naming mode. This means that each time the middleware creates a new segment for an incoming request,
the name of that segment is set to the default name. In dynamic mode, the segment name can vary between the host header of the request or the default name.
For more information about naming modes, see the aws-xray-sdk-core [README](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core/README.md).

## Automatic mode examples

    var AWSXRay = require('aws-xray-sdk-core');
    var xrayExpress = require('aws-xray-sdk-express');
    var app = express();

    //...

    app.use(xrayExpress.openSegment('defaultName'));

    app.get('/', function (req, res) {
      var segment = AWSXRay.getSegment();

      //...

      res.render('index');
    });

    app.use(xrayExpress.closeSegment());

## Manual mode examples

    var AWSXRay = require('aws-xray-sdk-core');
    var xrayExpress = require('aws-xray-sdk-express');
    var app = express();

    //...

    var AWSXRay = require('aws-xray-sdk');

    app.use(xrayExpress.openSegment('defaultName'));               //Required at the start of your routes

    app.get('/', function (req, res) {
      var segment = req.segment;

      //...

      res.render('index');
    });

    app.use(xrayExpress.closeSegment());   //Required at the end of your routes / first in error handling routes
