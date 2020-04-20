
## Requirements

* AWS X-Ray SDK Core
* MySQL 2.12.0 or greater

## AWS X-Ray and MySQL

The AWS X-Ray MySQL package automatically records query information and request and
response data. Simply patch the MySQL package via `captureMySQL` as shown below.

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the `cls-hooked` package and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference. See the examples below.

### Environment variables

    MYSQL_DATABASE_VERSION           Sets additional data for the sql subsegment.
    MYSQL_DRIVER_VERSION             Sets additional data for the sql subsegment.

### Lambda Example
    var AWSXRay = require('aws-xray-sdk');
    var pg = AWSXRay.captureMySQL(require('mysql'));

    ...

    exports.handler = function (event, context, callback) {
      // Make MySQL queries normally
    }

## Automatic mode example

    var AWSXRay = require('aws-xray-sdk-core');
    var captureMySQL = require('aws-xray-sdk-mysql');

    var mysql = captureMySQL(require('mysql'));

    var config = { ... };

    ...

    var connection = mysql.createConnection(config);

    connection.query('SELECT * FROM cats', function(err, rows) {
      //Automatically captures query information and errors (if any)
    });

    ...

    var pool = mysql.createPool(config);

    pool.query('SELECT * FROM cats', function(err, rows, fields) {
      //Automatically captures query information and errors (if any)
    }

## Manual mode example

    var AWSXRay = require('aws-xray-sdk-core');
    var captureMySQL = require('aws-xray-sdk-mysql');

    var mysql = captureMySQL(require('mysql'));

    var config = { ... };

    ...

    var connection = mysql.createConnection(config);

    connection.query('SELECT * FROM cats', function(err, rows) {
      //Automatically captures query information and errors (if any)
    }, segment);

    ...

    var pool = mysql.createPool(config);

    pool.query('SELECT * FROM cats', function(err, rows, fields) {
      //Automatically captures query information and errors (if any)
    }, segment);
