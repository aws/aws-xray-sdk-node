var assert = require('chai').assert;
var sinon = require('sinon');

var Segment = require('../../lib/segments/segment');
var Subsegment = require('../../lib/segments/attributes/subsegment');
var ContextUtils = require('../../lib/context_utils');

var LOG_ERROR = 'LOG_ERROR';
var LOG_ERROR_FCN_NAME = 'contextMissingLogError';
var RUNTIME_ERROR = 'RUNTIME_ERROR';
var RUNTIME_ERROR_FCN_NAME = 'contextMissingRuntimeError';

describe('ContextUtils', function() {
  function reloadContextUtils() {
    var path = '../../lib/context_utils';
    delete require.cache[require.resolve(path)];
    ContextUtils = require(path);
  }

  describe('init', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
      delete process.env.AWS_XRAY_CONTEXT_MISSING;
      reloadContextUtils();
    });

    it('should start in automatic mode by creating the X-Ray namespace', function() {
      assert.equal(ContextUtils.getNamespace().name, 'AWSXRay');
    });

    it('should set the contextMissingStrategy to RUNTIME_ERROR by default', function() {
      assert.equal(ContextUtils.contextMissingStrategy.contextMissing.name, RUNTIME_ERROR_FCN_NAME);
    });

    it('should set the contextMissingStrategy to the process.env.AWS_XRAY_CONTEXT_MISSING strategy if present', function() {
      process.env.AWS_XRAY_CONTEXT_MISSING = LOG_ERROR;
      reloadContextUtils();

      assert.equal(ContextUtils.contextMissingStrategy.contextMissing.name, LOG_ERROR_FCN_NAME);
    });
  });

  describe('#resolveManualSegmentParams', function() {
    var autoModeStub, params, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      autoModeStub = sandbox.stub(ContextUtils, 'isAutomaticMode').returns(false);
      params = {
        Bucket: 'moop',
        Key: 'boop'
      };
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should return null if in automatic mode', function() {
      autoModeStub.returns(true);
      params.XRaySegment = new Segment('moop');

      assert.isUndefined(ContextUtils.resolveManualSegmentParams(params));
    });

    it('should return XRaySegment if of type Segment', function() {
      var segment = params.XRaySegment = new Segment('moop');

      assert.equal(ContextUtils.resolveManualSegmentParams(params), segment);
    });

    it('should return XRaySegment if of type Subsegment', function() {
      var segment = params.XRaySegment = new Subsegment('moop');

      assert.equal(ContextUtils.resolveManualSegmentParams(params), segment);
    });

    it('should return null if XRaySegment is not of type Segment or Subsegment', function() {
      params.XRaySegment = 'moop';

      assert.isNull(ContextUtils.resolveManualSegmentParams(params));
    });

    it('should delete XRaySegment from the params passed', function() {
      params.XRaySegment = new Segment('moop');
      ContextUtils.resolveManualSegmentParams(params);

      assert.isUndefined(params.XRaySegment);
    });

    it('should return Segment if of type Segment', function() {
      var segment = params.Segment = new Segment('moop');

      assert.equal(ContextUtils.resolveManualSegmentParams(params), segment);
    });

    it('should return Segment if of type Subsegment', function() {
      var segment = params.Segment = new Subsegment('moop');

      assert.equal(ContextUtils.resolveManualSegmentParams(params), segment);
    });

    it('should return null if Segment is not of type Segment or Subsegment', function() {
      params.Segment = 'moop';

      assert.isNull(ContextUtils.resolveManualSegmentParams(params));
    });

    it('should delete Segment from the params passed', function() {
      params.Segment = new Segment('moop');
      ContextUtils.resolveManualSegmentParams(params);

      assert.isUndefined(params.Segment);
    });

    it('should take XRaySegment as a priority', function() {
      params.XRaySegment = 'moop';

      assert.isNull(ContextUtils.resolveManualSegmentParams(params));
    });
  });

  describe('#setContextMissingStrategy', function() {
    var sandbox;

    beforeEach(function() {
      reloadContextUtils();
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
      delete process.env.AWS_XRAY_CONTEXT_MISSING;
    });

    it('should accept and set the LOG_ERROR strategy', function() {
      ContextUtils.setContextMissingStrategy(LOG_ERROR);
      assert.equal(ContextUtils.contextMissingStrategy.contextMissing.name, LOG_ERROR_FCN_NAME);
    });

    it('should accept and set the RUNTIME_ERROR strategy', function() {
      ContextUtils.setContextMissingStrategy(RUNTIME_ERROR);
      assert.notEqual(ContextUtils.contextMissingStrategy.contextMissing, RUNTIME_ERROR_FCN_NAME);
    });

    it('should accept and set a custom strategy', function() {
      var custom = function() {};
      ContextUtils.setContextMissingStrategy(custom);
      assert.equal(ContextUtils.contextMissingStrategy.contextMissing, custom);
    });

    it('should ignore the configuration change if process.env.AWS_XRAY_CONTEXT_MISSING is set', function() {
      var custom = function() {};
      process.env.AWS_XRAY_CONTEXT_MISSING = LOG_ERROR;
      reloadContextUtils();

      ContextUtils.setContextMissingStrategy(custom);
      assert.notEqual(ContextUtils.contextMissingStrategy.contextMissing, custom);
    });

    it('should throw an error if given an invalid string', function() {
      assert.throws(function() { ContextUtils.setContextMissingStrategy('moop'); } );
    });

    it('should throw an error if given an invalid parameter type', function() {
      assert.throws(function() { ContextUtils.setContextMissingStrategy({}); } );
    });
  });
});
