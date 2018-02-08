
## Requirements

AWS SDK v2.7.15 or greater if using `captureAWS` or `captureAWSClient`

## AWS X-Ray

The AWS X-Ray SDK (the SDK) automatically records information for incoming and outgoing
requests and responses (via middleware). It also automatically records local data
such as function calls, time, variables (via metadata and annotations), and Amazon
EC2 instance data (via plugins). Currently, only Express
applications are supported for automatic capturing. See the [aws-xray-sdk-express]
(https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express) package for additional information.

The SDK exposes the Segment and Subsegment objects so you can create your own capturing
mechanisms, but a few are supplied.
These keep the current subsegment up to date in automatic mode, or propagate the current subsegment in manual mode.

`AWSXRay.captureFunc` - Takes a function that takes a single subsegment argument. This creates a new nested subsegment and exposes it. The segment
closes automatically when the function finishes executing. This does not correctly
time functions with asynchronous calls. Instead, use
captureAsyncFunc.

`AWSXRay.captureAsyncFunc` - Takes a function that takes a single subsegment argument. This creates a new nested subsegment and exposes it. The segment
must be closed using subsegment.close() or subsegment.close(error) when the asynchronous function completes.

`AWSXRay.captureCallbackFunc` - Takes a function to be used as a callback. Useful
for capturing callback information and directly associating it to the call
that generated it. This creates a new nested subsegment and exposes it by appending it onto the arguments used to call the callback. For this reason,
always call your captured callbacks with the full parameter list. The subsegment closes
automatically when the function finishes executing.

## Setup

### Automatic and manual mode

The AWS X-Ray SDK has two modes: `manual` and `automatic`.
By default, the SDK is in automatic mode. You can flip the mode of the SDK using the following:

    AWSXRay.enableManualMode();

    AWSXRay.enableAutomaticMode();

#### Automatic mode

Automatic mode is for use with the `aws-xray-sdk-express` module to support Express
applications, but can be used outside of Express applications.
The `aws-xray-sdk-express` module captures incoming request/response information via middleware and creates the base segment object automatically.
If your application isn't using the Express middleware, you have to create a
new segment, and set this on the SDK when in automatic mode.

    var segment = new AWSXRay.Segment(name, [optional root ID], [optional parent ID]);
    AWSXRay.setSegment(segment);

For more information about developing your own middleware or using automatic mode without middleware, see the `developing custom solutions
using automatic mode` section below.

Automatic mode uses the Continuation Local Storage package and automatically tracks
the current segment or subsegment when using the built-in capture functions or any
of the aws-xray-sdk modules. Using the built-in capture functions or other aws-xray-sdk modules automatically creates
new subsegments to capture additional data and update the current segment or subsegment on that context.

You can retrieve the current segment or subsegment at any time using
the following:

    var segment = AWSXRay.getSegment();

#### Manual mode

Manual mode requires that you pass around the segment reference. See the examples
below for the different usages.

### Environment variables

**Environment variables always override values set in code.**

    AWS_XRAY_DEBUG_MODE              Enables logging to console output. Logging to a file is no longer built in. See 'configure logging' below.
    AWS_XRAY_TRACING_NAME            For overriding the default segment name to use
    with the middleware. See 'dynamic and fixed naming modes'.
    AWS_XRAY_DAEMON_ADDRESS          For setting the daemon address and port. Expects 'x.x.x.x', 'hostname', ':yyyy', 'x.x.x.x:yyyy' or 'hostname:yyyy' IPv4 formats.
    AWS_XRAY_CONTEXT_MISSING         For setting the SDK behavior when trace context is missing. Valid values are 'RUNTIME_ERROR' or 'LOG_ERROR'. The SDK's default behavior is 'RUNTIME_ERROR'.

### Daemon configuration

By default, the SDK expects the daemon to be at 127.0.0.1 (localhost) on port 2000. You can override the address, port, or both.
You can change this via the environment variables listed above, or through
code. The same format applies to both.

    AWSXRay.setDaemonAddress('hostname:8000');
    AWSXRay.setDaemonAddress('186.34.0.23:8082');
    AWSXRay.setDaemonAddress(':8082');
    AWSXRay.setDaemonAddress('186.34.0.23');

### Logging configuration

Default logging to a file has been removed. To set up file logging, configure a logger
that responds to debug, info, warn, and error functions.
To log information about configuration, be sure you set the logger before other configuration
options.

    AWSXRay.setLogger(logger);

### Sampling configuration

When using our supported AWS X-Ray-enabled frameworks, you can configure the rates
at which the SDK samples requests to capture.

A sampling rule defines the rate at which requests are sampled for a particular endpoint, HTTP method, and URL of the incoming request.
In this way, you can change the behavior of sampling using `http_method`, `service_name`,
`url_path` attributes to specify the route, and then use
`fixed_target` and rate to determine sampling rates.

Fixed target refers to the maximum number of requests to sample per second. When this
threshold is reached, the sampling decision uses the specified percentage (rate) to sample on.

The SDK comes with a default sampling file at `/lib/resources/sampling_rules.js`.
You can choose to override this by providing a custom sampling file.

    AWSXRay.middleware.setSamplingRules(<path to file>);
    AWSXRay.middleware.setSamplingRules(<JSON object>);

A sampling file must have a "default" defined. The default matches all routes as a fallback, if none of the rules match.

    {
      "rules": [],
      "default": {
        "fixed_target": 10,
        "rate": 0.05
      },
      "version": 1
    }

Order of priority is determined by the spot in the rules array, top being highest priority. The default is always checked last.
Service name, URL path, and HTTP method patterns are case insensitive, and use a string with wild cards as the pattern format.
A `*` represents any number of characters, while `?` represents a single character. A description is optional.

    {
      "rules": [
        {
          "description": "Sign-in request",
          "http_method": "GET",
          "service_name": "*.foo.com",
          "url_path": "/signin/*",
          "fixed_target": 10,
          "rate": 0.05
        }
      ],
      "default": {
        "fixed_target": 10,
        "rate": 0.05
      },
      "version": 1
    }

### AWS SDK whitelist configuration

The AWS X-Ray SDK automatically captures data from AWS SDK calls, including service,
operation, start time, end time, and any errors returned.
However, some service operations are whitelisted to capture extra parameters on the request and response.
These are pulled in via a default whitelisting file in the SDK in the `aws-xray-sdk-core` package under `lib/resources/aws_whitelist.json`.
Each service is whitelisted by the AWS SDK's `service identifier` and `operation` properties.

  request_parameters are properties to capture in the request
  request_descriptors are objects to capture, or to process and capture in the request (get_keys, get_count)
  response_parameters are properties to capture in the response data
  response_descriptors are objects to capture, or to process and capture in the response data (get_keys, get_count)

This is an example document that whitelists X-Ray to capture the `Bucket` and `key` request parameters on an s3.getObject call.

    {
      "services": {
        "s3": {
          "operations": {
            "getObject": {
              "request_parameters": [
                "Bucket",
                "Key"
              ]
            }
          }
        }
      }
    }

You can set a custom AWS whitelist using the following:

    AWSXRay.setAWSWhitelist(<path to file>);     //Replaces the default whitelist with the given custom one
    AWSXRay.setAWSWhitelist(<JSON object>);

    AWSXRay.appendAWSWhitelist(<path to file>);  //Appends to the current whitelist
    AWSXRay.appendAWSWhitelist(<JSON object>);

### Dynamic and fixed naming modes

The SDK requires that a default segment name is set when using middleware. If it
isn't set, an error is thrown. You can override this value via the `AWS_XRAY_TRACING_NAME`
environment variable.

    app.use(AWSXRay.express.openSegment('defaultName'));

The SDK defaults to a fixed naming mode. This means that each time a new segment is created for an incoming request,
the name of that segment is set to the default name.

In dynamic mode, the segment name can vary between the host header of the request or the default name.

    AWSXRay.middleware.enableDynamicNaming(<pattern>);

If no pattern is provided, the host header is used as the segment name. If no host header is present, the default is used.
This is equivalent to using the pattern `*`.

If a pattern is provided, in the form of a string with wild cards (ex: `*.*.us-east-?.elasticbeanstalk.com`),
the host header of the request is checked against it.
A `*` represents any number of characters, while `?` represents a single character.
If the host header is present and matches this pattern, it's used as the segment name.
Otherwise, the default name is used.

### Partial subsegment streaming and the streaming threshold

By default, the SDK is configured to have a threshold of 100 subsegments per segment.
This is because the UDP packet maximum size is ~65 kb, and
larger segments might trigger the 'Segment too large to send' error.

To remedy this, the SDK automatically sends the completed subsegments to the daemon
when the threshold is breached.
Additionally, subsegments that complete when over the threshold automatically send
themselves. If a subsegment is sent out of band, it
is pruned from the segment object. The full segment is reconstructed on the service
side. You can change the threshold as needed.

    AWSXRay.setStreamingThreshold(10);

Subsegments can be marked as `in_progress` when sent to the daemon. The SDK is telling
the service to anticipate the asynchronous subsegment
to be received out of band when it has completed. When received, the in_progress subsegment
is discarded in favor of the completed subsegment.

### Developing custom solutions using automatic mode

Automatic mode is for use with the aws-xray-sdk-express module to support Express
applications, however it can be used outside of Express applictions.
If your application isn't using the Express middleware, you have to create the
new segment and set this on the SDK.
You need to create a new level of CLS, and you can do so by using the CLS namespace object. We expose this via the following.

    AWSXRay.getNamespace();

CLS provides several methods of setting the context. Here is an example usage.

    var segment = new AWSXRay.Segment(name, [optional root ID], [optional parent ID]);
    var ns = AWSXRay.getNamespace();

    ns.run(function () {
      AWSXRay.setSegment(segment);
      ....
    });

If you are using a different web framework and want to set up automatic capturing,
the X-Ray SDK provides helper functions under `AWSXRay.middleware`.
See the [aws-xray-sdk-express](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express) module for more information.

For additional information about and examples for using the CLS namespace to create
a new context, see: https://github.com/othiym23/node-continuation-local-storage.

### Capture subsegmenets within chained native Promise using automatic mode

If you have chained native Promise and you have subsegments generated within those promises, you should consider to run the following code to patch the behavior of CLS on binding X-Ray context to Promise.

    AWSXRay.capturePromise();

This will solve the issue where the subsegments within a Promise chain are attached to wrong segments or nested instead of being siblings. For more details on the discussion please see this [PR](https://github.com/aws/aws-xray-sdk-node/pull/11).

## Example code

### Version capturing

    Use the 'npm start' script to enable.

### Capture all incoming HTTP requests to '/'

    var app = express();

    //...

    var AWSXRay = require('aws-xray-sdk');

    app.use(AWSXRay.express.openSegment('defaultName'));               //required at the start of your routes

    app.get('/', function (req, res) {
      res.render('index');
    });

    app.use(AWSXRay.express.closeSegment());   //Required at the end of your routes / first in error handling routes

### Capture all outgoing AWS requests

    var AWS = captureAWS(require('aws-sdk'));

    // Create new AWS clients as usual.

### Configure AWSXRay to automatically capture EC2 instance data

    var AWSXRay = require('aws-xray-sdk');
    AWSXRay.config([AWSXRay.plugins.EC2Plugin]);

### Add annotations

    var key = 'hello';
    var value = 'there';        // must be string, boolean or finite number

    subsegment.addAnnotation(key, value);

### Add metadata

    var key = 'hello';
    var value = 'there';

    subsegment.addMetadata(key, value);
    subsegment.addMetadata(key, value, 'greeting');   //custom namespace

### Create new subsegment

    var newSubseg = subsegment.addNewSubsegment(name);

    // Or

    var subsegment = new Subsegment(name);

## Automatic mode examples

Automatic mode is for use with the aws-xray-sdk-express module to support Express
applications, however it can be used outside of Express applications.
If the Express middleware isn't being used, you have to create a root segment and
set on the SDK using the following.

    var segment = new AWSXRay.Segment(name, [optional root ID], [optional parent ID]);
    AWSXRay.setSegment(segment);

Only then will the segment be available for use in automatic mode and be able to be picked up by the capture functions and other aws-xray-sdk modules.

### Capture all incoming HTTP requests to '/'

    var app = express();

    //...

    var AWSXRay = require('aws-xray-sdk');

    app.use(AWSXRay.express.openSegment('defaultName'));

    app.get('/', function (req, res) {
      res.render('index');
    });

    app.use(AWSXRay.express.closeSegment());

### Capture through function calls

    var AWSXRay = require('aws-xray-sdk');

    app.use(AWSXRay.express.openSegment('defaultName'));

    //...

    //The root segment is created by the Express middleware
    //This creates 5 nested subsegments on the root segment
    //and captures timing data individually for each subsegment

    app.get('/', function (req, res) {
      captureFunc('1', function(subsegment1) {
        //Exposing the subsegment in the function is optional, and is listed here
        as an example
        //You can also use
        //var subsegment1 = AWSXRay.getSegment();

        captureFunc('2', function(subsegment2) {
          captureFunc('3', function(subsegment3) {
            captureFunc('4', function(subsegment4) {
              captureFunc('5', function() {
                //exposing the subsegment is optional
                res.render('index');
              });
            });
          });
        });
      });
    });

    app.use(AWSXRay.express.closeSegment());

### Capture through async function calls

    var AWSXRay = require('aws-xray-sdk');

    //...

    app.use(AWSXRay.express.openSegment('defaultName'));

    app.get('/', function (req, res) {
      var host = 'samplego-env.us-east-1.elasticbeanstalk.com';

      AWSXRay.captureAsyncFunc('send', function(subsegment) {
        //'subsegment' here is the newly created and exposed subsegment for the async
        //request, and must be closed manually (this ensures timing data is correct)

        sendRequest(host, function() {
          console.log("rendering!");
          res.render('index');
          subsegment.close();
        });
      });
    });

    app.use(AWSXRay.express.closeSegment());

    function sendRequest(host, cb) {
      var options = {
        host: host,
        path: '/',
      };

      var callback = function(response) {
        var str = '';

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

    //Use client as usual
    //Be sure any outgoing calls that are dependent on another async
    //function are wrapped with captureAsyncFunc, or duplicate segments might leak

### Capture outgoing AWS requests on every AWS SDK client

    var aws = AWSXRay.captureAWS(require('aws-sdk'));

    //Create new clients as usual
    //Be sure any outgoing calls that are dependent on another async
    //function are wrapped with captureAsyncFunc, or duplicate segments might leak

### Capture all outgoing HTTP/S requests

    var tracedHttp = AWSXRay.captureHTTPs(require('http'));     //returns a copy of the http module that is patched, can patch https as well.

    var options = {
      ...
    }

    tracedHttp.request(options, callback).end();

    //Create new requests as usual
    //Be sure any outgoing calls that are dependent on another async
    //function are wrapped with captureAsyncFunc, or duplicate segments might leak

## Manual mode examples

Enable manual mode:

    AWSXRay.enableManualMode();

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
