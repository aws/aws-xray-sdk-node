
## Requirements

AWS SDK v2.7.15 or greater if using `captureAWS` or `captureAWSClient`

## AWS X-Ray

The AWS X-Ray SDK (the SDK) allows developers to instrument their web applications 
to automatically record information for incoming and outgoing
requests and responses. It can also record local data
such as function calls, time, variables (via metadata and annotations), and Amazon
EC2, ECS, and Elastic Beanstalk metadata (via plugins). Currently, [Express](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express) and [Restify](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/restify)
applications are supported for automatic capturing via middleware. AWS Lambda functions can also be instrumented.

The SDK exposes the Segment and Subsegment objects so you can create your own capturing
mechanisms, but a few are supplied. See Capturing Function Calls below.

## Setup

### Automatic and manual mode

The AWS X-Ray SDK has two modes: `manual` and `automatic`.
By default, the SDK is in automatic mode. You can flip the mode of the SDK using the following:

    AWSXRay.enableManualMode();

    AWSXRay.enableAutomaticMode();

#### Automatic mode

Automatic mode is designed for use with Express, Restify, and Lambda
applications, but can be used outside of such applications.
For more information about developing your own middleware or using automatic mode without middleware, see the [developing custom solutions
using automatic mode](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#developing-custom-solutions-without-middleware) section below.

Automatic mode uses the `cls-hooked` package and automatically tracks
the current segment or subsegment when using the built-in capture functions or any
of the aws-xray-sdk modules. Using the built-in capture functions or other aws-xray-sdk modules automatically creates
new subsegments to capture additional data and update the current segment or subsegment on that context.

You can retrieve the current segment or subsegment at any time using
the following:

    var segment = AWSXRay.getSegment();

#### Manual mode

Manual mode requires that you pass around the segment reference. See the 
[manual mode examples](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#Manual-Mode-Examples) 
section for different usages.

### Environment variables

**Environment variables always override values set in code.**

    AWS_XRAY_DEBUG_MODE              Enables logging of debug messages to console output. Logging to a file is no longer built in. See 'configure logging' below.
    AWS_XRAY_TRACING_NAME            For overriding the default segment name to use
    with the middleware. See 'dynamic and fixed naming modes'.
    AWS_XRAY_DAEMON_ADDRESS          For setting the daemon address and port.
    AWS_XRAY_CONTEXT_MISSING         For setting the SDK behavior when trace context is missing. Valid values are 'RUNTIME_ERROR', 'IGNORE_ERROR' or 'LOG_ERROR'. The SDK's default behavior is 'RUNTIME_ERROR'.
    AWS_XRAY_LOG_LEVEL               Sets a log level for the SDK built in logger. This value is ignored if AWS_XRAY_DEBUG_MODE is set.
    AWS_XRAY_COLLECT_SQL_QUERIES     Enables SQL query capture (currently only Postgres supported)

### Daemon configuration

By default, the SDK expects the daemon to be at 127.0.0.1 (localhost) on port 2000. You can override the address for both UDP and TCP.
You can change this via the environment variables listed above, or through code. The same format applies to both.

    AWSXRay.setDaemonAddress('hostname:8000');
    AWSXRay.setDaemonAddress('186.34.0.23:8082');
    AWSXRay.setDaemonAddress('tcp:186.34.0.23:8082, udp:127.0.0.1:3000');
    AWSXRay.setDaemonAddress('udp:186.34.0.23:8082, tcp:127.0.0.1:3000');

### Logging configuration

By default the SDK will log error messages to the console using the standard methods on the console object. The log
level of the built in logger can be set bu using either the `AWS_XRAY_DEBUG_MODE` or `AWS_XRAY_LOG_LEVEL` environment
variables.

If `AWS_XRAY_DEBUG_MODE` is set to a truthy value, e.g. true, then the log level will be set to debug. If
`AWS_XRAY_DEBUG_MODE` is not set then `AWS_XRAY_LOG_LEVEL` will be used to determine the log level. This variable can
be set to either debug, info, warn, error or silent. Be warned if the log level is set to silent then NO log
messages will be produced. The default log level is error and this will be used if neither environment variable
is set or if an invalid level is specified.

If you wish to provide a different format or destination for the logs then you can provide the SDK with your own
implementation of the logger interface as shown below. Any object that implements this interface can be used.
This means that many logging libraries, e.g. Winston, could be used and passed to the SDK directly.

```js
// Create your own logger or instantiate one using a library.
var logger = {
  error: (message, meta) => { /* logging code */ },
  warn: (message, meta) => { /* logging code */ },
  info: (message, meta) => { /* logging code */ },
  debug: (message, meta) => { /* logging code */ }
}

AWSXRay.setLogger(logger);
```

If you use your own logger you are responsible for determining the log level as the `AWS_XRAY_DEBUG_MODE` and
`AWS_XRAY_LOG_LEVEL` only apply to the default logger.

Note that by default the provided logger prefixes each log line with a timestamp and the
log level of the message. However this is not the case when using this SDK
within an AWS Lambda function. In that scenario the timestamp and level are added by the Lambda runtime instead.

### Context Missing Strategy Configuration

By default, when the X-Ray SDK is operating in automatic mode and attempts to find a segment in the `cls-hooked` context but
cannot find one, it throws a runtime error. This behavior can be undesirable when unit testing or doing experimentation. 
It can be changed to instead log an error either by using the `AWS_XRAY_CONTEXT_MISSING` environment variable documented above, or programatically by calling

    AWSXRay.setContextMissingStrategy("LOG_ERROR");

You can also pass in your own function to set custom behavior for handling context missing errors.

    AWSXRay.setContextMissingStrategy(myFunction);

### Sampling configuration

When using our supported AWS X-Ray-enabled frameworks, you can configure the rates at which the SDK samples requests to capture.
By default the SDK fetches sampling rules from X-Ray service. You can disable it by calling

    AWSXRay.middleware.disableCentralizedSampling();

so that the SDK use local rules exclusively. You can also set local sampling rules in case the X-Ray SDK can't reach
the back-end service and the service sampling rules expire (TTL is 1 hour). The following shows how to configure local rules.

A local sampling rule defines the rate at which requests are sampled for a particular endpoint, HTTP method, and URL of the incoming request.
In this way, you can change the behavior of sampling using `http_method`, `host`, `url_path` attributes to specify the route, and then
use `fixed_target` and rate to determine sampling rates.

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
      "version": 2
    }

Order of priority is determined by the spot in the rules array, top being highest priority. The default is always checked last.
Host, URL path, and HTTP method patterns are case insensitive, and use a string with wild cards as the pattern format.
A `*` represents any number of characters, while `?` represents a single character. A description is optional.

    {
      "rules": [
        {
          "description": "Sign-in request",
          "http_method": "GET",
          "host": "*.foo.com",
          "url_path": "/signin/*",
          "fixed_target": 10,
          "rate": 0.05
        }
      ],
      "default": {
        "fixed_target": 10,
        "rate": 0.05
      },
      "version": 2
    }

### AWS SDK allow-list configuration

The AWS X-Ray SDK automatically captures data from AWS SDK calls, including service,
operation, start time, end time, and any errors returned.
However, some service operations are allow-listed to capture extra parameters on the request and response.
These are pulled in via a default allow-listing file in the SDK in the `aws-xray-sdk-core` package under `lib/resources/aws_whitelist.json`.
Each service is allow-listed by the AWS SDK's `service identifier` and `operation` properties.

    request_parameters are properties to capture in the request
    request_descriptors are objects to capture, or to process and capture in the request (get_keys, get_count)
    response_parameters are properties to capture in the response data
    response_descriptors are objects to capture, or to process and capture in the response data (get_keys, get_count)

This is an example document that allow-lists X-Ray to capture the `Bucket` and `key` request parameters on an s3.getObject call.

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

You can set a custom AWS allow-list using the following:

    AWSXRay.setAWSWhitelist(<path to file>);     //Replaces the default allow-list with the given custom one
    AWSXRay.setAWSWhitelist(<JSON object>);

    AWSXRay.appendAWSWhitelist(<path to file>);  //Appends to the current allow-list
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

### Capturing Function Calls

```ts
AWSXRay.captureFunc<T>(
  name: string, 
  fcn: (subsegment?: Subsegment) => T, 
  parent?: Segment | Subsegment
): T
```
`AWSXRay.captureFunc` - Takes a function that takes a single subsegment argument. This creates a new nested subsegment and exposes it. The segment
closes automatically when the function finishes executing and returns the result if any. This does not correctly
time functions with asynchronous calls. Instead, use
`captureAsyncFunc`.

```ts
captureAsyncFunc<T>(
  name: string,
  fcn: (subsegment?: Subsegment) => T,
  parent?: Segment | Subsegment
): T
```
`AWSXRay.captureAsyncFunc` - Takes an async function that takes a single subsegment argument and returns the promise by executing the function. 
This creates a new nested subsegment and exposes it. 
The segment must be closed using subsegment.close() the asynchronous function completes successfully.

```ts
captureCallbackFunc<S extends any[], T>(
  name: string,
  fcn: (...args: S) => T,
  parent?: Segment | Subsegment
): (...args: S) => T
```

`AWSXRay.captureCallbackFunc` - Takes a function to be used as a callback. Useful
for capturing callback information and directly associating it to the call
that generated it. This creates a new nested subsegment and exposes it by appending it onto the arguments used to call the callback. For this reason,
always call your captured callbacks with the full parameter list. The subsegment closes
automatically when the function finishes executing.

### Developing custom solutions without middleware

If your application isn't using a supported framework, you have to create the
new segment and set this on the SDK.
You need to create a new context using CLS and store your segment in it so that 
the SDK can retrieve it for automatic capturing. 
You can do so by using the CLS namespace object. We expose this via the following API:

    AWSXRay.getNamespace();

The `cls-hooked` library provides several methods of setting the context. Here is an example usage.

```js
var segment = new AWSXRay.Segment(name, [optional root ID], [optional parent ID]);
var ns = AWSXRay.getNamespace();

ns.run(function () {
  AWSXRay.setSegment(segment);
  
  // Requests using AWS SDK, HTTP calls, SQL queries...
  
  segment.close();
});
```

If you are using a different web framework and want to set up automatic capturing,
the X-Ray SDK provides helper functions under `AWSXRay.middleware`.
See the [aws-xray-sdk-express](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/express) module for more information.

For additional information about and examples for using the CLS namespace to create
a new context, see: https://github.com/jeff-lewis/cls-hooked.

### Capture subsegments within chained native Promise using automatic mode

If you have chained native Promise and you have subsegments generated within those promises, you should consider to run the following code to patch the behavior of CLS on binding X-Ray context to Promise.

    AWSXRay.capturePromise();

This will solve the issue where the subsegments within a Promise chain are attached to wrong segments or nested instead of being siblings. For more details on the discussion please see this [PR](https://github.com/aws/aws-xray-sdk-node/pull/11). See the "Capture all outgoing Axios requests" section for full sample code. 

## Usage in AWS Lambda

To understand X-Ray's integration with Lambda functions, please read the [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/lambda-x-ray.html). Lambda functions are unique environments because a segment is automatically provided in function code once `Active Tracing` is enabled for a function. That segment is immutable, however all subsegment operations described below are permitted.

By default in Lambda, the streaming threshold is set to 0 (immediate subsegment streaming), centralized sampling is disabled, automatic mode is enabled, and the daemon address is set by the Lambda runtime.

For an example function, see [tracing node.js functions](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html).

## General Example Code
This can be used with either automatic or manual mode.

### Version capturing

    Use the 'npm start' script to enable.

### Configure AWSXRay to automatically capture EC2 instance data

```js
var AWSXRay = require('aws-xray-sdk');
AWSXRay.config([AWSXRay.plugins.EC2Plugin]);
```

### Add annotations

```js
var key = 'hello';
var value = 'there';        // must be string, boolean or finite number

subsegment.addAnnotation(key, value);
```

### Add metadata

```js
var key = 'hello';
var value = 'there';

subsegment.addMetadata(key, value);               // default namespace 'default'
subsegment.addMetadata(key, value, 'greeting');   // custom namespace 'greeting'
```
    
### Set user

Note that this operation will not work in Lambda functions, because the segment object is immutable. `setUser()` can only be applied to segments, not subsegments. 

```js
var user = 'john123';

AWSXRay.getSegment().setUser(user);
```

### Create new subsegment

```js
var newSubseg = subsegment.addNewSubsegment(name);
// Do something
newSubseg.close();

// Or

var newSubseg = new Subsegment(name);
subsegment.addSubsegment(newSubseg);
// Do something
newSubseg.close();
```

## Automatic Mode Examples

### Capture through function calls

This creates 5 nested subsegments on the root segment and captures timing data individually for each subsegment. This example assumes an automatic mode environment.

```js
captureFunc('1', function(subsegment1) {
  //Exposing the subsegment in the function is optional, and is listed here as an example
  //You can also use:
  var subsegment1 = AWSXRay.getSegment();

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
```

### Capture through async function calls

```js
var host = 'samplego-env.us-east-1.elasticbeanstalk.com';

AWSXRay.captureAsyncFunc('send', function(subsegment) {
  //'subsegment' here is the newly created and exposed subsegment for the async
  //request, and must be closed manually (this ensures timing data is correct)

  sendRequest(host, function() {
    console.log("Request sent!");
    subsegment.close();
  });
});

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
```

### Capture all outgoing AWS requests

This is only available for AWS SDK v2 due to the modular architecture of AWS SDK v3. For more details on the difference between AWS SDK v2 and v3, see this [blog post](https://aws.amazon.com/blogs/developer/modular-aws-sdk-for-javascript-is-now-generally-available/).

```js
var AWS = captureAWS(require('aws-sdk'));

// Create new AWS clients as usual.
```

### Capture outgoing AWS requests on a single client


**AWS SDK v3**

```js
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = AWSXRay.captureAWSv3Client(new S3({}));

await s3.send(new PutObjectCommand({
  Bucket: bucketName,
  Key: keyName,
  Body: 'Hello!',
}));
```

Note: Some TypeScript users may experience a type incompatibility error when patching v3 clients. As a workaround, you can cast the client
to type `any` when patching:

```js
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3({});
const s3Patched = AWSXRay.captureAWSv3Client(s3 as any);
```

**AWS SDK v2**

```js
var s3 = AWSXRay.captureAWSClient(new AWS.S3());

//Use client as usual
//Be sure any outgoing calls that are dependent on another async
//function are wrapped with captureAsyncFunc, or duplicate segments might leak
```

### Capture all outgoing HTTP and HTTPS requests

```js
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));

// Requests with this http client, and any other http/https client including
// those used by third party modules, will now be traced
var http = require('http');
```

### Capture all outgoing HTTP and HTTPS requests, adding custom subsegment information

```js
const callback = (subsegment, req, res, err) => {
  subsegment.addMetadata('accept', req.getHeader('accept'));

  if (err && err.code) {
    subsegment.addAnnotation('errorCode', err.code);
  }

  if (res) {
    subsegment.addMetadata('content-type', res.getHeader('content-type'));
  }
};
AWSXRay.captureHTTPsGlobal(require('http'), null, callback);
AWSXRay.captureHTTPsGlobal(require('https'), null, callback);

// Requests with this http client, and any other http/https client including
// those used by third party modules, will now be traced
// Additional metadata / annotations can be added in the callback based on 
// the request, response and any error
var http = require('http');
```

### Capture outgoing HTTP/S requests with a traced client

```js
//returns a copy of the http module that is patched, can patch https as well
var tracedHttp = AWSXRay.captureHTTPs(require('http'));     

var options = {
  ...
}

tracedHttp.request(options, callback).end();

//Create new requests as usual
//Be sure any outgoing calls that are dependent on another async
//function are wrapped with captureAsyncFunc, or duplicate segments might leak
```

### Capture all outgoing Axios requests

This sample code works with any promise-based HTTP client.

```js
const AWSXRay = require('aws-xray-sdk');
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.capturePromise();
const AxiosWithXray = require('axios');
```

## Manual Mode Examples
Note that in all these examples, a segment must be manually created and closed
because they do not use middleware. If you are using middleware, or are on Lambda,
the calls to create, close, and flush segments are not necessary.

### Capture through function calls
Here, the root segment is created manually and 5 nested subsegments are attached
to it. Note that the parent (sub)segment must be passed to each captured function
as the last argument.

```js
var AWSXRay = require('aws-xray-sdk');

AWSXRay.enableManualMode();

var segment = new AWSXRay.Segment('myApplication');

captureFunc('1', function(subsegment1) {
  captureFunc('2', function(subsegment2) {
    captureFunc('3', function(subsegment3) {
      captureFunc('4', function(subsegment4) {
        captureFunc('5', function() {
          //subsegment need not be exposed here since we're not doing anything with it

          console.log('hello world');
        }, subsegment4);
      }, subsegment3);
    }, subsegment2);
  }, subsegment1);
}, segment);

segment.close();
segment.flush();
```

### Capture through async function calls

```js
var AWSXRay = require('aws-xray-sdk');

AWSXRay.enableManualMode();

var segment = new AWSXRay.Segment('myApplication');
var host = 'samplego-env.us-east-1.elasticbeanstalk.com';

AWSXRay.captureAsyncFunc('send', function(subsegment) {
  sendRequest(host, function() {
    console.log("Got response!");
    subsegment.close();
  }, subsegment);
}, segment);

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
```

### Capture outgoing AWS requests on a single client

**AWS SDK v3**

You must re-capture the client every time the subsegment is attached to a new parent.

```js
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';

// subsegment is an optional parameter that is required for manual mode
// and can be omitted in automatic mode (e.g. inside a Lambda function).
const s3 = AWSXRay.captureAWSv3Client(new S3({}), subsegment);

await s3.send(new PutObjectCommand({
  Bucket: bucketName,
  Key: keyName,
  Body: 'Hello!',
}));
```

Note: Some TypeScript users may experience a type incompatibility error when patching v3 clients. As a workaround, you can cast the client
to type `any` when patching:

```js
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3({});
const s3Patched = AWSXRay.captureAWSv3Client(s3 as any);
```

**AWS SDK v2**

```js
var s3 = AWSXRay.captureAWSClient(new AWS.S3());
var params = {
  Bucket: bucketName,
  Key: keyName,
  Body: 'Hello!',
  XRaySegment: subsegment             //required 'XRaySegment' param
};

s3.putObject(params, function(err, data) {
  // ...
});
```

### Capture all outgoing AWS requests

This is only available for AWS SDK v2 due to the modular architecture of AWS SDK v3. For more details on the difference between AWS SDK v2 and v3, see this [blog post](https://aws.amazon.com/blogs/developer/modular-aws-sdk-for-javascript-is-now-generally-available/).

```js
var AWS = captureAWS(require('aws-sdk'));

//Create new clients as usual
//Be sure any outgoing calls that are dependent on another async
//function are wrapped, or duplicate segments might leak
```

### Capture all outgoing HTTP/S requests

```js
var tracedHttp = AWSXRay.captureHTTPs(require('http'));     //returns a copy of the http module that is patched, can patch https as well.

...

//Include sub/segment reference in options as 'XRaySegment'
var options = {
  ...
  XRaySegment: subsegment             //required 'XRaySegment' param
}

tracedHttp.request(options, callback).end();
```
