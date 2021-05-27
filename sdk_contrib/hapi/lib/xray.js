const fs = require('fs');
const path = require('path');

const AWSXray = require('aws-xray-sdk-core');
const { middleware: mwUtils } = AWSXray;

const defaultOptions = {
  automaticMode: true,
  logger: console,
};

/**
 * Sets up the plugin for use
 * @param [options] Options for the plugin setup
 * @param {String} [options.segmentName] Segment name to use in place of default segment name generator
 * @param {Boolean} [options.captureAWS] Specifies that AWS calls should be captured. Requires aws-sdk package.
 * @param {Boolean} [options.captureHTTP] Specifies that downstream http calls should be captured by default.
 * @param {Boolean} [options.capturePromises] Specifies that downstream promises should be captured.
 * @param {Object} [options.logger] Logger to pass to xray
 * @param {Boolean} [options.automaticMode] Puts xray into automatic or manual mode. Default is true (automatic)
 * @param {Object[]} [options.plugins] Array of AWS plugins to pass to xray
 */
exports.setup = (options) => {
  const localOptions = { ...defaultOptions, ...options };

  if (localOptions.logger) {
    AWSXray.setLogger(localOptions.logger);
  }

  const segmentName =
    localOptions.segmentName || exports._internals.createSegmentName();
  mwUtils.setDefaultName(segmentName);

  if (localOptions.automaticMode) {
    AWSXray.enableAutomaticMode();
  } else {
    AWSXray.enableManualMode();
  }

  if (localOptions.plugins) {
    AWSXray.config(localOptions.plugins);
  }

  if (localOptions.captureAWS) {
    AWSXray.captureAWS(require('aws-sdk'));
  }

  if (localOptions.captureHTTP) {
    AWSXray.captureHTTPsGlobal(require('http'), true);
    AWSXray.captureHTTPsGlobal(require('https'), true);
  }

  if (localOptions.capturePromises) {
    AWSXray.capturePromise();
  }
};

/**
 * Handles the hapi request to set up the XRay segment
 */
exports.handleRequest = async (request, h) => {
  const header = mwUtils.processHeaders(request);
  const name = mwUtils.resolveName(request.headers.host);

  const segment = new AWSXray.Segment(
    name,
    header.Root || header.root,
    header.Parent || header.parent
  );

  const { req, res } = request.raw;
  res.req = req;

  mwUtils.resolveSampling(header, segment, res);

  segment.addIncomingRequestData(new mwUtils.IncomingRequestData(req));

  mwUtils.middlewareLog('Starting Hapi XRay segment', request.url, segment);

  if (AWSXray.isAutomaticMode()) {
    const ns = AWSXray.getNamespace();
    if (!request.plugins) {
      request.plugins = {};
    }
    request.plugins.hapiXray = {
      xrayNamespace: ns,
      xrayContext: ns.createContext(),
    };
    ns.bindEmitter(req);
    ns.bindEmitter(res);
    ns.enter(request.plugins.hapiXray.xrayContext);
    AWSXray.setSegment(segment);
  }
  request.segment = segment;

  return h.continue;
};

exports.handleResponse = (request) => {
  try {
    exports._internals.endSegment(request);
  } finally {
    if (request.plugins && request.plugins.hapiXray) {
      const { xrayNamespace, xrayContext } = request.plugins.hapiXray;

      if (xrayNamespace && xrayContext) {
        xrayNamespace.exit(xrayContext);
      }
    }
  }
};

exports.handleError = (request, error) => {
  const { segment } = request;

  if (segment) {
    segment.addError(error);
    mwUtils.middlewareLog(
      'Hapi XRay segment encountered an error',
      request.url,
      segment
    );
  }
};

exports._internals = {
  endSegment: function (request) {
    const { segment, response } = request;

    if (!segment || segment.isClosed()) {
      return;
    }

    if (response) {
      if (response.statusCode >= 400) {
        if (response.statusCode === 429) {
          segment.addThrottleFlag();
        }
        const cause = AWSXray.utils.getCauseTypeFromHttpStatus(
          response.statusCode
        );
        if (cause) {
          segment[cause] = true;
        }
      }
      segment.http.close(response);
    }

    segment.close();
    mwUtils.middlewareLog(
      'Closed Hapi XRay segment successfully',
      request.url,
      segment
    );
  },

  /**
   * Creates a name for the segment based on the package name and version
   * @returns {String}
   * @private
   */
  createSegmentName: function () {
    let segmentName = 'service';
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pjson = require(pkgPath);
      segmentName = `${pjson.name || 'service'}_${pjson.version || 'v1'}`;
    }
    return segmentName;
  },
};
