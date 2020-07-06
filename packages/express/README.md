
## Requirements

* AWS X-Ray SDK Core (aws-xray-sdk-core)
* Express 4.14.0 or greater

## AWS X-Ray and Express

The AWS X-Ray Express package automatically records information for incoming and outgoing
requests and responses, via the middleware functions in this package. To configure sampling, 
dynamic naming, and more see the [set up section](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#setup).

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the `cls-hooked` package and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference.

In automatic mode, you can get the current segment/subsegment at any time:

    var segment = AWSXRay.getSegment();

In manual mode, you can get the base segment off of the request object:

    var segment = req.segment;

## Middleware Usage

The X-Ray SDK provides two middlewares: `AWSXRay.express.openSegment(<name>)`
and `AWSXRay.express.closeSegment()`. These two middlewares must be used together 
and wrap all of your defined routes that you'd like to trace. 
In automatic mode, the `openSegment` middleware *must* be the last middleware added
before defining routes, and the `closeSegment` middleware *must* be the 
first middleware added after defining routes. Otherwise issues with the `cls-hooked`
context may occur.

## Sample App

To get started with a functional express application instrumented with the X-Ray SDK, check out our [sample app](https://github.com/aws-samples/aws-xray-sdk-node-sample).

## Automatic mode example
For more automatic mode examples, see the 
[Automatic Mode Examples](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#Automatic-Mode-Examples).

### Capture all incoming requests to `/` and `/directory`

```js
var AWSXRay = require('aws-xray-sdk-core');
var xrayExpress = require('aws-xray-sdk-express');
var app = express();

//...

app.use(xrayExpress.openSegment('defaultName'));

app.get('/', function (req, res) {
  var segment = AWSXRay.getSegment();
  segment.addAnnotation('page', 'home');

  //...

  res.render('index');
});

app.get('/directory', function (req, res) {
  var segment = AWSXRay.getSegment();
  segment.addAnnotation('page', 'directory');

  //...

  res.render('directory');
});

app.use(xrayExpress.closeSegment());
```

## Manual mode examples
For more manual mode examples, e.g. what to do with the segment inside your route logic,
see the [Manual Mode Examples](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#Manual-Mode-Examples). Note that you don't have to manually start or close the segments since that is handled by the X-Ray middleware.

### Capture All incoming requests to `/`

```js
var AWSXRay = require('aws-xray-sdk-core');
var xrayExpress = require('aws-xray-sdk-express');
var app = express();

//...

var AWSXRay = require('aws-xray-sdk');

//Required at the start of your routes
app.use(xrayExpress.openSegment('defaultName'));

app.get('/', function (req, res) {
  var segment = req.segment;

  //...

  res.render('index');
});

app.use(xrayExpress.closeSegment());   //Required at the end of your routes / first in error handling routes
```
