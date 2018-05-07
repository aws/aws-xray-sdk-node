/**
 * Koa middleware module.
 *
 * Exposes Koa middleware functions to enable automated data capturing on a web service. To enable on a Node.js/Koa application,
 * use 'app.use(AWSXRayKoa.openSegment())' before defining your routes.  After your routes, before any extra error
 * handling middleware, use 'app.use(AWSXRayKoa.closeSegment())'.
 * Use AWSXRay.getSegment() to access the current sub/segment.
 * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
 * @module koa_mw
 */

var AWSXRay = require('aws-xray-sdk-core');

var mwUtils = AWSXRay.middleware;
var IncomingRequestData = mwUtils.IncomingRequestData;
var Segment = AWSXRay.Segment;

var koaMW = {

  /**
   * Use 'app.use(AWSXRayKoa.openSegment('defaultName'))' before defining your routes.
   * Use AWSXRay.getSegment() to access the current sub/segment.
   * Otherwise, for manual mode, this appends the Segment object to the request object as req.segment.
   * @param {string} defaultName - The default name for the segment.
   * @alias module:koa_mw.openSegment
   * @returns {function}
   */

  openSegment: function openSegment(defaultName) {
    if (!defaultName || typeof defaultName !== 'string')
      throw new Error('Default segment name was not supplied.  Please provide a string.');

    mwUtils.setDefaultName(defaultName);

    return function open(ctx, next) {
      var amznTraceHeader = mwUtils.processHeaders(ctx);
      var name = mwUtils.resolveName(ctx.host);
      var segment = new Segment(name, amznTraceHeader.Root, amznTraceHeader.Parent);

      mwUtils.resolveSampling(amznTraceHeader, segment, ctx);
      segment.addIncomingRequestData(new IncomingRequestData(ctx));

      AWSXRay.getLogger().debug('Starting koa segment: { url: ' + ctx.url + ', name: ' + segment.name + ', trace_id: ' +
        segment.trace_id + ', id: ' + segment.id + ', sampled: ' + !segment.notTraced + ' }');

      ctx.res.on('finish', function () {
        if (this.statusCode === 429)
          segment.addThrottleFlag();
        if (AWSXRay.utils.getCauseTypeFromHttpStatus(this.statusCode))
          segment[AWSXRay.utils.getCauseTypeFromHttpStatus(this.statusCode)] = true;

        segment.http.close(this);
        segment.close();

        AWSXRay.getLogger().debug('Closed koa segment successfully: { url: ' + ctx.url + ', name: ' + segment.name + ', trace_id: ' +
          segment.trace_id + ', id: ' + segment.id + ', sampled: ' + !segment.notTraced + ' }');
      });

      if (AWSXRay.isAutomaticMode()) {
        var ns = AWSXRay.getNamespace();
        ns.bindEmitter(ctx.req);
        ns.bindEmitter(ctx.res);

        ns.run(function () {
          AWSXRay.setSegment(segment);

          if (next) { return next(); }
        });
      } else {
        ctx.segment = segment;
        if (next) { return next(); }
      }
    };
  },

  /**
   * After your routes, before any extra error handling middleware, use 'app.use(AWSXRayKoa.closeSegment())'.
   * @alias module:koa_mw.closeSegment
   * @returns {function}
   */

  closeSegment: function closeSegment() {
    return function close(err, ctx, next) {
      var segment = AWSXRay.resolveSegment(ctx.segment);

      if (segment && err) {
        segment.close(err);

        AWSXRay.getLogger().debug('Closed koa segment with error: { url: ' + ctx.url + ', name: ' + segment.name + ', trace_id: ' +
          segment.trace_id + ', id: ' + segment.id + ', sampled: ' + !segment.notTraced + ' }');

      } else if (segment) {
        segment.close();

        AWSXRay.getLogger().debug('Closed koa segment successfully: { url: ' + ctx.url + ', name: ' + segment.name + ', trace_id: ' +
          segment.trace_id + ', id: ' + segment.id + ', sampled: ' + !segment.notTraced + ' }');
      }

      if (next)
        next(err);
    };
  }
};

module.exports = koaMW;
