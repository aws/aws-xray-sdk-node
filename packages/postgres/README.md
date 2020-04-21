
## Requirements

* AWS X-Ray SDK Core
* Postgres 6.1.0 or greater

## AWS X-Ray and Postgres

The AWS X-Ray Postgres package automatically records query information and request
and response data. Simply patch the Postgres package via `capturePostgres` as shown below.

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the `cls-hooked` package and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference. See the examples below.

### Environment variables

    POSTGRES_DATABASE_VERSION        Sets additional data for the sql subsegment.
    POSTGRES_DRIVER_VERSION          Sets additional data for the sql subsegment.

### Lambda Example
    var AWSXRay = require('aws-xray-sdk');
    var pg = AWSXRay.capturePostgres(require('pg'));

    ...

    exports.handler = function (event, context, callback) {
      // Make postgres queries normally
    }

### Automatic mode example

    var AWSXRay = require('aws-xray-sdk-core');
    var capturePostgres = require('aws-xray-sdk-postgres');

    var pg = capturePostgres(require('pg'));

    ...

    var client = new pg.Client();

    client.connect(function (err) {
      ...

      client.query({name: 'moop', text: 'SELECT $1::text as name'}, ['brianc'], function (err, result) {
        //Automatically captures query information and errors (if any)
      });
    });

    ...

    var pool = new pg.Pool(config);
    pool.connect(function(err, client, done) {
      if(err) {
        return console.error('error fetching client from pool', err);
      }
      var query = client.query('SELECT * FROM mytable', function(err, result) {
        //Automatically captures query information and errors (if any)
      });
    });

### Manual mode example

    var AWSXRay = require('aws-xray-sdk-core');
    var capturePostgres = require('aws-xray-sdk-postgres');

    var pg = capturePostgres(require('pg'));

    ...

    var client = new pg.Client();

    client.connect(function (err) {
      ...

      client.query({name: 'moop', text: 'SELECT $1::text as name'}, ['mcmuls'], function (err, result) {
        //Automatically captures query information and errors (if any)
      });
    });

    ...

    var pool = new pg.Pool(config);
    pool.connect(function(err, client, done) {
      if(err) {
        return console.error('error fetching client from pool', err);
      }
      var query = client.query('SELECT * FROM mytable', function(err, result) {
        //Automatically captures query information and errors (if any)
      }, segment));
    };
