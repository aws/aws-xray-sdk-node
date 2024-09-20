# fetch-xray

A patcher for AWSXRay to support fetch, implemented via either the [node-fetch module](https://www.npmjs.com/package/node-fetch) or the built-in 
global fetch support starting with [NodeJS 18](https://nodejs.org/en/blog/announcements/v18-release-announce).

## Usage

```js
const { captureFetchGlobal } = require('aws-xray-sdk-fetch');

// To use globally defined fetch (available in NodeJS 18+)
const fetch = captureFetchGlobal();
const result = await fetch('https://foo.com');

// To use node-fetch module
const { captureFetchModule } = require('aws-xray-sdk-fetch');
const fetchModule = require('node-fetch');
const fetch = captureFetchModule(fetchModule); // Note, first parameter *must* be the node-fetch module
const result = await fetch('https://foo.com');
```

There are two optional parameters you can pass when calling `captureFetchGlobal` / `captureFetchModule`:

* **downstreamXRayEnabled**: when True, adds a "traced:true" property to the subsegment so the AWS X-Ray service expects a corresponding segment from the downstream service (default = False)
* **subsegmentCallback**: a callback that is called with the subsegment, the fetch request, the fetch response and any error issued, allowing custom annotations and metadata to be added

TypeScript bindings for the capture functions are included.

## Testing

Unit and integration tests can be run using `npm run test`.  Typings file tess can be run using `npm run test-d`.

## Errata

1. This package CommonJS to conform with the rest of the AWSXRay codebase.  As such, it is incompatible with node-fetch 3, which is ESM only.  As such, it is written
to be compatible with [node-fetch version 2](https://www.npmjs.com/package/node-fetch#CommonJS), which should still receive critical fixes.  If you are using global
fetch (available in NodeJS 18+) then this isn't an issue for you.

2. This package is designed working under the assumption that the NodeJS implementation of fetch is compatible with node-fetch, albeit with its own separate, 
built-in typings.  If NodeJS takes fetch in a different direction (breaks compatibility) then that would most likely break this package.  There is no indication that
I could find that this will happen, but throwing it out there "just in case".

## Contributors

- [Jason Terando](https://github.com/jasonterando)
- [Bernd Fuhrmann](https://github.com/berndfuhrmann)
