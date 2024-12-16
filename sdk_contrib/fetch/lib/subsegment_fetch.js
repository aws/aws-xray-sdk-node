const {Subsegment} = require('aws-xray-sdk-core');

/**
 * Extends Subsegment to append remote request data to subsegment, similar to what
 * Subsegment.prototype.addRemoteRequestData does in core/lib/segments/attributes/subsegment.js
 * @param {Subsegment} subsegment
 * @param {Fetch Request} request
 * @param {Fetch Request or null|undefined} response
 * @param {boolean} downstreamXRayEnabled
 */
Subsegment.prototype.addFetchRequestData = function addFetchRequestData(request, response, downstreamXRayEnabled) {
  this.http = {
    request: {
      url: request.url?.toString() ?? '',
      method: request.method ?? ''
    }
  };

  if (downstreamXRayEnabled) {
    this.traced = true;
  }

  if (response) {
    this.http.response = {
      status: response.status
    };
    if (response.headers) {
      const clength = response.headers.get('content-length');
      if (clength) {
        const v = parseInt(clength);
        if (! Number.isNaN(v)) {
          this.http.response.content_length = v;
        }
      }
    }
  }
};
