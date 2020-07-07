
## Requirements

* AWS X-Ray SDK Core (aws-xray-sdk-core)
* Restify 4.3.0 or greater

## AWS X-Ray and Restify

The AWS X-Ray Restify package automatically records information for incoming and outgoing
requests and responses, via the 'enable' function in this package. To configure sampling, dynamic naming, and more see the [set up section](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#setup).

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the `cls-hooked` package and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference.

In automatic mode, you can get the current segment or subsegment at any time:

    var segment = AWSXRay.getSegment();

In manual mode, you can get the base segment off of the request object:

    var segment = req.segment;

    //If the restify context plugin is being used, it is placed under 'XRaySegment'
    var segment = req.get('XRaySegment');

## Middleware usage

The X-Ray SDK provides a single Restify middleware: 
`AWSXRayRestify.enable(<server>, <defaultName>)`. This *must* be added as the last middleware before defining all routes you'd like to have traced, otherwise issues with the `cls-hooked` context may occur. Error capturing will be done automatically.

## Automatic mode examples

For more automatic mode examples, see the [example code](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#Automatic-Mode-Examples).

```js
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
```

## Manual mode examples

For more manual mode examples, see [manual mode examples](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#Manual-Mode-Examples). The X-Ray SDK can be used identically inside Restify routes. Note that you don't have to manually start or close the segments since that is handled by the X-Ray middleware.

```js
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
```
