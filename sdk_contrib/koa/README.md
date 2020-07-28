
## Requirements

  AWS X-Ray SDK Core (aws-xray-sdk-core)
  Koa 2.x or greater

## AWS X-Ray and Koa

The AWS X-Ray Koa package automatically records information for incoming and outgoing
requests and responses, via the middleware functions in this package. To configure sampling, 
dynamic naming, and more see the [set up section](https://github.com/aws/aws-xray-sdk-node/tree/master/packages/core#setup).

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the `cls-hooked` package and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference.

In automatic mode, you can get the current segment/subsegment at any time:
    var segment = AWSXRay.getSegment();

In manual mode, you can get the base segment off of the context object:
    var segment = ctx.segment;

## Middleware Usage

The Koa X-Ray SDK provides one middlewares: `xrayKoa.openSegment(<name>)`. 
This middleware will wrap all of the defined routes that you'd like to trace. 
In automatic mode, the `openSegment` middleware *must* be the last middleware added
before defining routes, otherwise issues with the `cls-hooked`
context may occur.

## Automatic mode examples
```js
var AWSXRay = require('aws-xray-sdk-core');
var xrayKoa = require('aws-xray-sdk-koa2');
var app = new Koa();

//...

app.use(xrayKoa.openSegment('defaultName'));

router.get('/myRoute', (ctx) => {
    const segment = AWSXRay.getSegment();
    //Do whatever 
});
```

## Manual mode examples
```js
var AWSXRay = require('aws-xray-sdk-core');
var xrayKoa = require('aws-xray-sdk-koa2');
var app = new Koa();

//...

var AWSXRay = require('aws-xray-sdk');

app.use(xrayKoa.openSegment('defaultName')); //Required at the start of your routes

router.get('/myRoute', (ctx) => {
    const segment = ctx.segment;
    //Do whatever 
});
```

