
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
For more automatic mode examples, see the [example code](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#example-code).

### Capture all incoming requests to `/` and `/directory`

    var AWSXRay = require('aws-xray-sdk-core');
    var xrayExpress = require('aws-xray-sdk-express');
    var app = express();

    //...

    app.use(xrayExpress.openSegment('defaultName'));

    app.get('/', function (req, res) {
      var segment = AWSXRay.getSegment();
      segment.addAnnotaion('page', 'home');

      //...

      res.render('index');
    });

    app.get('/directory', function (req, res) {
      var segment = AWSXRay.getSegment();
      segment.addAnnotaion('page', 'directory');

      //...

      res.render('directory');
    });

    app.use(xrayExpress.closeSegment());

## Manual mode examples

### Capture All incoming requests to `/`

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

### Capture through function calls

    var AWSXRay = require('aws-xray-sdk');

    app.use(AWSXRay.express.openSegment('defaultName'));

    //...

    //The root segment is created by the Express middleware
    //This creates 5 nested subsegments on the root segment
    //and captures timing data individually for each subsegment

    app.get('/', function (req, res) {
      var segment = req.segment;

      captureFunc('1', function(subsegment1) {
        captureFunc('2', function(subsegment2) {
          captureFunc('3', function(subsegment3) {
            captureFunc('4', function(subsegment4) {
              captureFunc('5', function() {
                //subsegment need not be exposed here since we're not doing anything with it

                res.render('index');
              }, subsegment4);
            }, subsegment3);
          }, subsegment2);
        }, subsegment1);
      }, segment);
    });

    app.use(AWSXRay.express.closeSegment());

### Capture through async function calls

    var AWSXRay = require('aws-xray-sdk');

    AWSXRay.enableManualMode();

    app.use(AWSXRay.express.openSegment('defaultName'));

    app.get('/', function (req, res) {
      var segment = req.segment;
      var host = 'samplego-env.us-east-1.elasticbeanstalk.com';

      AWSXRay.captureAsyncFunc('send', function(subsegment) {
        sendRequest(host, function() {
          console.log("rendering!");
          res.render('index');
          subsegment.close();
        }, subsegment);
      }, segment);
    });

    app.use(AWSXRay.express.closeSegment());

    function sendRequest(host, cb, subsegment) {
      var options = {
        host: host,
        path: '/',
        XRaySegment: subsegment            //required 'XRaySegment' param
      };

      var callback = function(response) {
        var str = '';

        //The whole response has been received, so we just print it out here
        //Another chunk of data has been received, so append it to `str`
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          cb();
        });
      }

      http.request(options, callback).end();
    };

### Capture outgoing AWS requests on a single client

    var s3 = AWSXRay.captureAWSClient(new AWS.S3());
    var params = {
      Bucket: bucketName,
      Key: keyName,
      Body: 'Hello!',
      XRaySegment: subsegment             //required 'XRaySegment' param
    };

    s3.putObject(params, function(err, data) {
      ...
    });

### Capture all outgoing AWS requests

    var AWS = captureAWS(require('aws-sdk'));

    //Create new clients as usual
    //Be sure any outgoing calls that are dependent on another async
    //function are wrapped, or duplicate segments might leak

### Capture all outgoing HTTP/S requests

    var tracedHttp = AWSXRay.captureHTTPs(require('http'));     //returns a copy of the http module that is patched, can patch https as well.

    ...

    //Include sub/segment reference in options as 'XRaySegment'
    var options = {
      ...
      XRaySegment: subsegment             //required 'XRaySegment' param
    }

    tracedHttp.request(options, callback).end();
