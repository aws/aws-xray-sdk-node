
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

```js
import AWSXRay from 'aws-xray-sdk';
import pg from 'pg';

const tracedPg = AWSXRay.capturePostgres(pg);

...

export const handler = async (event, context) => {
  const client = new tracedPg.Client();
  // Make postgres queries normally
};
```

### Automatic mode example

```js
import capturePostgres from 'aws-xray-sdk-postgres';
import pg from 'pg';

const tracedPg = capturePostgres(pg);

...

const client = new tracedPg.Client();

client.connect(function (err) {
  ...

  client.query({name: 'get-name', text: 'SELECT $1::text as name'}, ['example'], function (err, result) {
    //Automatically captures query information and errors (if any)
  });
});

...

const pool = new tracedPg.Pool(config);
pool.connect(function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  const query = client.query('SELECT * FROM mytable', function(err, result) {
    //Automatically captures query information and errors (if any)
  });
});
```

### Manual mode example

```js
import AWSXRay from 'aws-xray-sdk-core';
import capturePostgres from 'aws-xray-sdk-postgres';
import pg from 'pg';

const tracedPg = capturePostgres(pg);

...

const segment = AWSXRay.getSegment();
const client = new tracedPg.Client();

client.connect(function (err) {
  ...

  client.query(
    {name: 'get-name', text: 'SELECT $1::text as name'},
    ['example'],
    function (err, result) {
      //Captures query information and errors (if any) on the provided segment
    },
    segment
  );
});

...

const pool = new tracedPg.Pool(config);
pool.connect(function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  const query = client.query('SELECT * FROM mytable', function(err, result) {
    //Captures query information and errors (if any) on the provided segment
  }, segment);
});
```

### TypeScript example

```ts
import * as AWSXRay from 'aws-xray-sdk-core';
import * as PG from 'pg';
import { capturePostgres } from 'aws-xray-sdk-postgres';

const pg = capturePostgres(PG);
const segment = AWSXRay.getSegment();
const client = new pg.Client();

client.connect((err: Error) => {
  ...

  client.query(
    { name: 'get-name', text: 'SELECT $1::text as name' },
    ['example'],
    (err: Error, result: PG.QueryResult) => {
      //Captures query information and errors (if any)
    },
    segment
  );
});
```
