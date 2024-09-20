/**
 * @module fetch_p
 */

/**
 * This module patches the global fetch instance for NodeJS 18+
 */
const AWSXRay = require('aws-xray-sdk-core');
const utils = AWSXRay.utils;
const getLogger = AWSXRay.getLogger;
require('./subsegment_fetch');

/**
 * Wrap fetch global instance for recent NodeJS to automatically capture information for the segment.
 * This patches the built-in fetch function globally.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @param {function} subsegmentCallback - a callback that is called with the subsegment, the fetch request,
 *   the fetch response and any error issued, allowing custom annotations and metadata to be added.
 * @alias module:fetch_p.captureFetchGlobal
 */
function captureFetchGlobal(downstreamXRayEnabled, subsegmentCallback) {
  if (globalThis.fetch === undefined) {
    throw new Error('Global fetch is not available in NodeJS');
  }
  if (!globalThis.__fetch) {
    globalThis.__fetch = globalThis.fetch;
    globalThis.fetch = enableCapture(globalThis.__fetch, globalThis.Request,
      downstreamXRayEnabled, subsegmentCallback);
  }
  return globalThis.fetch;
}

/**
 * Wrap fetch module to capture information for the segment.
 * This patches the fetch function distributed in node-fetch package.
 * @param {fetch} module - The fetch module
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @param {function} subsegmentCallback - a callback that is called with the subsegment, the fetch request,
 *   the fetch response and any error issued, allowing custom annotations and metadata to be added.
 * @alias module:fetch_p.captureFetchModule
 */
function captureFetchModule(module, downstreamXRayEnabled, subsegmentCallback) {
  if (!module.default) {
    getLogger().warn('X-ray capture did not find fetch function in module');
    return null;
  }
  if (!module.__fetch) {
    module.__fetch = module.default;
    module.default = enableCapture(module.__fetch, module.Request,
      downstreamXRayEnabled, subsegmentCallback);
  }
  return module.default;
}

/**
 * Return a fetch function that will pass segment information to the target host.
 * This does not change any globals
 * @param {function} baseFetchFunction fetch function to use as basis
 * @param {function} requestClass Request class to use. This should correspond to the supplied fetch function.
 * @param {boolean} downstreamXRayEnabled - when true, adds a "traced:true" property to the subsegment
 *   so the AWS X-Ray service expects a corresponding segment from the downstream service.
 * @param {function} subsegmentCallback - a callback that is called with the subsegment, the fetch request,
 *   the fetch response and any error issued, allowing custom annotations and metadata to be added.
 * @returns Response
 */
function enableCapture(baseFetchFunction, requestClass, downstreamXRayEnabled, subsegmentCallback) {

  const overridenFetchAsync = async (...args) => {
    const thisDownstreamXRayEnabled = !!downstreamXRayEnabled;
    const thisSubsegmentCallback = subsegmentCallback;
    // Standardize request information
    const request = typeof args[0] === 'object' ?
      args[0] :
      new requestClass(...args);

    // Facilitate the addition of Segment information via the request arguments
    const params = args.length > 1 ? args[1] : {};

    // Short circuit if the HTTP is already being captured
    if (request.headers.has('X-Amzn-Trace-Id')) {
      return await baseFetchFunction(...args);
    }

    const url = new URL(request.url);
    const isAutomaticMode = AWSXRay.isAutomaticMode();

    const parent = AWSXRay.resolveSegment(AWSXRay.resolveManualSegmentParams(params));
    const hostname = url.hostname || url.host || 'Unknown host';

    if (!parent) {
      let output = '[ host: ' + hostname +
        (request.method ? (', method: ' + request.method) : '') +
        ', path: ' + url.pathname + ' ]';

      if (isAutomaticMode) {
        getLogger().info('RequestInit for request ' + output +
          ' is missing the sub/segment context for automatic mode. Ignoring.');
      } else {
        getLogger().info('RequestInit for request ' + output +
          ' requires a segment object on the options params as "XRaySegment" for tracing in manual mode. Ignoring.');
      }

      // Options are not modified, only parsed for logging. We can pass in the original arguments.
      return await baseFetchFunction(...args);
    }

    let subsegment;
    if (parent.notTraced) {
      subsegment = parent.addNewSubsegmentWithoutSampling(hostname);
    } else {
      subsegment = parent.addNewSubsegment(hostname);
    }

    subsegment.namespace = 'remote';

    if (!parent.noOp) {
      request.headers.set('X-Amzn-Trace-Id',
        'Root=' + (parent.segment ? parent.segment : parent).trace_id +
        ';Parent=' + subsegment.id +
        ';Sampled=' + (subsegment.notTraced ? '0' : '1'));
    }

    // Set up fetch call and capture any thrown errors
    const capturedFetch = async () => {
      const requestClone = request.clone();
      let response;
      try {
        response = await baseFetchFunction(requestClone);

        if (thisSubsegmentCallback) {
          thisSubsegmentCallback(subsegment, requestClone, response);
        }

        const statusCode = response.status;
        if (statusCode === 429) {
          subsegment.addThrottleFlag();
        }

        const cause = utils.getCauseTypeFromHttpStatus(statusCode);
        if (cause) {
          subsegment[cause] = true;
        }

        subsegment.addFetchRequestData(requestClone, response, thisDownstreamXRayEnabled);
        subsegment.close();
        return response;
      } catch (e) {
        if (thisSubsegmentCallback) {
          thisSubsegmentCallback(subsegment, requestClone, response, e);
        }
        const madeItToDownstream = (e.code !== 'ECONNREFUSED');
        subsegment.addErrorFlag();
        subsegment.addFetchRequestData(requestClone, response, madeItToDownstream && thisDownstreamXRayEnabled);
        subsegment.close(e);
        throw (e);
      }
    };

    if (isAutomaticMode) {
      const session = AWSXRay.getNamespace();
      return await session.runPromise(async () => {
        AWSXRay.setSegment(subsegment);
        return await capturedFetch();
      });
    } else {
      return await capturedFetch();
    }
  };

  return overridenFetchAsync;
}

module.exports.captureFetchGlobal = captureFetchGlobal;
module.exports.captureFetchModule = captureFetchModule;
module.exports.enableCapture = enableCapture;
