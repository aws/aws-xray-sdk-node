var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var CapturedException = require('../../../lib/segments/attributes/captured_exception');
var SegmentEmitter = require('../../../lib/segment_emitter');
var SegmentUtils = require('../../../lib/segments/segment_utils');
var Segment = require('../../../lib/segments/segment');
var Subsegment = require('../../../lib/segments/attributes/subsegment');
var logger = require('../../../lib/logger');
var Lambda = require('../../../lib/env/aws_lambda');
var Context = require('../../../lib/context_utils');

chai.should();
chai.use(sinonChai);

describe('Segment', function() {
  describe('#init', function() {
    var rootId = '1-57fbe041-2c7ad569f5d6ff149137be86';
    var parentId = 'f9c6e4f0b5116501';

    var sandbox;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should use the supplied root id as the trace id', function() {
      var segment = new Segment('foo', rootId);
      assert.equal(segment.trace_id, rootId);
    });

    it('should use the supplied parent id', function() {
      var segment = new Segment('foo', null, parentId);
      assert.equal(segment.parent_id, parentId);
    });

    it('should generate a new trace id if one was not supplied', function() {
      var segment = new Segment('foo');
      var expected = new RegExp('^1-([a-f0-9]{8})-([a-f0-9]{24})$');

      assert.match(segment.trace_id, expected);
    });

    it('should generate a 16 character hex id', function() {
      var segment = new Segment('foo');
      var expected = new RegExp('^([a-f0-9]{16})$');

      assert.match(segment.id, expected);
    });

    it('should use SegmentUtils origin property to add global attributes', function() {
      SegmentUtils.setOrigin('hello');
      var segment = new Segment('foo');

      assert.equal(segment.origin, 'hello');
      delete SegmentUtils.origin;
    });

    it('should use SegmentUtils pluginData properties call addPluginData', function() {
      var data = { data: 'hello' };
      SegmentUtils.setPluginData(data);
      var stubAddPluginData = sandbox.stub(Segment.prototype, 'addPluginData');
      new Segment('foo');

      stubAddPluginData.should.have.been.calledWithExactly(data);
      delete SegmentUtils.pluginData;
    });

    it('should use SegmentUtils sdkData properties call setSDKData', function() {
      var data = {
        sdk: 'X-Ray for Node.js'
      };
      SegmentUtils.setSDKData(data);
      var stubSetSDKData = sandbox.stub(Segment.prototype, 'setSDKData');
      new Segment('foo');

      stubSetSDKData.should.have.been.calledWithExactly(data);
      delete SegmentUtils.sdkData;
    });

    it('should use SegmentUtils serviceData properties call setServiceData', function() {
      var serviceData = '2.3.0';
      SegmentUtils.setServiceData(serviceData);
      var stubSetServiceData = sandbox.stub(Segment.prototype, 'setServiceData');
      new Segment('foo');

      stubSetServiceData.should.have.been.calledWithExactly(serviceData);
      delete SegmentUtils.serviceData;
    });
  });

  describe('#addMetadata', function() {
    var key, segment, value;

    beforeEach(function() {
      segment = new Segment('test');
      key = 'key';
      value = [1, 2, 3];
    });

    it('should add key value pair to metadata.default if no namespace is supplied', function() {
      segment.addMetadata(key, value);
      assert.propertyVal(segment.metadata.default, key, value);
    });

    it('should add key value pair to metadata[namespace] if a namespace is supplied', function() {
      var namespace = 'hello';
      segment.addMetadata(key, value, 'hello');
      assert.propertyVal(segment.metadata[namespace], key, value);
    });

    it('should not add key value pair to metadata[namespace] if a namespace is "__proto__"', function () {
      let namespace = '__proto__';
      segment.addMetadata(key, value, namespace);
      assert.notProperty(segment.metadata[namespace], key);
    });
  });

  describe('#addSDKData', function() {
    var segment, version;

    beforeEach(function() {
      segment = new Segment('test');
      version = '1.0.0-beta';
    });

    it('should add SDK data to aws.xray.sdk', function() {
      segment.setSDKData({
        sdk_version: version
      });
      assert.propertyVal(segment.aws.xray, 'sdk_version', version);
    });

    it('should perserve SDK data when adding a rule name', function() {
      segment.setSDKData({
        sdk_version: version
      });
      segment.setMatchedSamplingRule('rule');
      assert.propertyVal(segment.aws.xray, 'sdk_version', version);
    });
  });

  describe('#setMatchedSamplingRule', function() {
    var segment1, segment2, data;

    beforeEach(function() {
      segment1 = new Segment('test1');
      segment2 = new Segment('test2');
      data = {
        sdk_version: '2.0.0'
      };
    });

    it('should not pollute rule names', function() {
      segment1.setSDKData(data);
      segment2.setSDKData(data);
      segment1.setMatchedSamplingRule('rule1');
      segment2.setMatchedSamplingRule('rule2');

      assert.equal(segment1.aws.xray.rule_name, 'rule1');
      assert.equal(segment2.aws.xray.rule_name, 'rule2');
    });
  });

  describe('#addPluginData', function() {
    var segment, data;

    beforeEach(function() {
      segment = new Segment('test');
      data = { elastic_beanstalk: { environment: 'my_environment_name' }};
    });

    it('should add plugin data to aws', function() {
      segment.addPluginData(data);
      assert.deepEqual(segment.aws.elastic_beanstalk, data.elastic_beanstalk);
    });
  });

  describe('#setServiceData', function() {
    var segment, data;

    beforeEach(function() {
      segment = new Segment('test');
      data = {
        version: '2.3.0',
        package: 'sample-app'
      };
    });

    it('should add the service version to service.version', function() {
      segment.setServiceData(data);
      assert.propertyVal(segment.service, 'version', data.version);
      assert.propertyVal(segment.service, 'package', data.package);
    });
  });

  describe('#addNewSubsegment', function() {
    var segment;

    beforeEach(function() {
      segment = new Segment('test');
    });

    it('should add a new subsegment to the segment', function() {
      segment.addNewSubsegment('newSubsegment');
      assert.instanceOf(segment.subsegments[0], Subsegment);
    });

    it('should throw an error if trying to add a non-subsegment', function() {
      assert.throws( function() {
        segment.addNewSubsegment({});
      }, Error);
    });
  });

  describe('#addSubsegment', function() {
    var incrementStub, subsegment, sandbox, segment;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      segment = new Segment('test');

      subsegment = new Subsegment('new');
      incrementStub = sandbox.stub(segment, 'incrementCounter');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should throw an error if trying to add a non-subsegment', function() {
      assert.throws( function() {
        segment.addSubsegment({ key: 'x' });
      }, Error);
    });

    it('should add the new subsegment to the subsegments array' , function() {
      segment.addSubsegment(subsegment);
      assert.equal(segment.subsegments[0], subsegment);
    });

    it('should set the parent and segment properties', function() {
      segment.addSubsegment(subsegment);
      assert.equal(subsegment.parent, segment);
      assert.equal(subsegment.segment, segment);
    });

    it('should call to increment the counter', function() {
      segment.addSubsegment(subsegment);
      incrementStub.should.have.been.calledOnce;
    });

    it('should not call to increment the counter if the segment is closed', function() {
      subsegment.close();
      segment.addSubsegment(subsegment);

      incrementStub.should.have.not.been.called;
    });
  });

  describe('#addSubsegmentWithoutSampling', function () {
    let sandbox, setSegmentStub;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      setSegmentStub = sandbox.stub(Context, 'setSegment');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should have notTraced flag set to true for unsampled subsegment of Lambda facade segment', function() {
      process.env._X_AMZN_TRACE_ID = 'Root=1-57ff426a-80c11c39b0c928905eb0828d;Parent=1234abcd1234abcd;Sampled=1';

      Lambda.init();

      setSegmentStub.should.have.been.calledOnce;

      let facade = setSegmentStub.args[0][0];
      let unsampledSegment = facade.addNewSubsegmentWithoutSampling('unsampled-subsegment');
      assert.equal(unsampledSegment.notTraced, true);
    });

    it('should have notTraced flag set to undefined for subsegment of Lambda facade segment', function() {
      process.env._X_AMZN_TRACE_ID = 'Root=1-57ff426a-80c11c39b0c928905eb0828d;Parent=1234abcd1234abcd;Sampled=1';
      Lambda.init();

      setSegmentStub.should.have.been.calledOnce;

      let facade = setSegmentStub.args[0][0];
      let sampledSubsegment = facade.addNewSubsegment('sampled-subsegment');
      assert.equal(sampledSubsegment.notTraced, undefined);
    });

    it('should have notTraced flag set to true', function() {
      var segment = new Segment('parent');
      var child = new Subsegment('child');
      segment.addSubsegmentWithoutSampling(child);

      assert.equal(child.notTraced, true);
    });

    it('should have notTraced flag set to true for new unsampled subsegment', function() {
      var segment = new Segment('parent');
      var child = segment.addNewSubsegmentWithoutSampling('child');

      assert.equal(child.notTraced, true);
    });



    it('should not sample subsegment or subsegment of subsegment', function() {
      var segment = new Segment('parent');
      var child = new Subsegment('child');
      var child2 = new Subsegment('child-2');
      segment.addSubsegmentWithoutSampling(child);
      child.addSubsegmentWithoutSampling(child2);

      assert.equal(child.notTraced, true);
      assert.equal(child2.notTraced, true);
    });

    it('should not sample subsegment or subsegment of subsegment - mix', function() {
      const segment = new Segment('parent');
      const child = new Subsegment('child');
      const child2 = new Subsegment('child-2');
      const child3 = new Subsegment('child-3');
      segment.addSubsegmentWithoutSampling(child);
      child.addSubsegment(child2);
      const child4 = child2.addNewSubsegment('child-4');
      child.addSubsegmentWithoutSampling(child3);

      assert.equal(child.notTraced, true);
      assert.equal(child2.notTraced, true);
      assert.equal(child3.notTraced, true);
      assert.equal(child4.notTraced, true);
    });
  });

  describe('#addError', function() {
    var err, exceptionStub, sandbox, segment;

    beforeEach(function() {
      sandbox = sinon.createSandbox();

      exceptionStub = sandbox.stub(CapturedException.prototype, 'init');

      segment = new Segment('test');
      err = new Error('Test error');
      err.stack = ('Test error\n    at /path/to/file.js:200:15\n    ' +
        'at myTestFunction /path/to/another/file.js:20:30\n    ' +
        'at myTest [as _myTests] (test.js:10:5)');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should accept an object or string', function() {
      segment.addError(err);
      segment.addError('error');
      assert.equal(segment.cause.exceptions.length, 2);
    });

    it('should accept invalid types and log an error', function() {
      const loggerMock = sandbox.mock(logger.getLogger());
      loggerMock.expects('error').once();
      segment.addError(3);
      loggerMock.verify();
      assert.notEqual(segment.fault, true);
    });

    it('should set fault to true by default', function() {
      segment.addError(err);
      assert.equal(segment.fault, true);
    });

    it('should add the cause property with working directory data', function() {
      segment.addError(err);
      assert.property(segment.cause, 'working_directory');
    });

    it('should add a new captured exception', function() {
      segment.addError(err, true);
      exceptionStub.should.have.been.calledWithExactly(err, true);
    });
  });

  describe('#close', function() {
    var err, addErrorStub, flushStub, sandbox, segment;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      segment = new Segment('test');

      addErrorStub = sandbox.stub(segment, 'addError');
      flushStub = sandbox.stub(segment, 'flush');
      err = new Error('Test error');
    });

    afterEach(function() {
      sandbox.restore();
      SegmentUtils.setStreamingThreshold(100);
    });

    it('should set the end time if not already set', function() {
      segment.close();
      assert.property(segment, 'end_time');
    });

    it('should not reset the end time if already set', function() {
      var end = 111;

      segment.end_time = end;
      segment.close();
      assert.equal(segment.end_time, end);
    });

    it('should call "addError" if an error was given', function() {
      segment.close(err, true);
      addErrorStub.should.have.been.calledWithExactly(err, true);
    });

    it('should not call "addError" if no error was given', function() {
      segment.close();
      addErrorStub.should.have.not.been.called;
    });

    it('should delete properties "in_progress" and "exception"', function() {
      segment.in_progress = true;
      segment.exception = err;
      segment.close();

      assert.notProperty(segment, 'in_progress');
      assert.notProperty(segment, 'exception');
    });

    it('should flush the segment on close', function() {
      segment.close();

      flushStub.should.have.been.calledOnce;
    });
  });

  describe('#incrementCounter', function() {
    var sandbox, segment;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      segment = new Segment('test');
    });

    afterEach(function() {
      sandbox.restore();
      SegmentUtils.setStreamingThreshold(100);
    });

    it('should increment the counter', function() {
      segment.incrementCounter();

      assert.equal(segment.counter, 1);
    });

    it('should stream the subsegments when the count is greater than the SegmentUtils threshold', function() {
      SegmentUtils.setStreamingThreshold(0);
      var child1 = segment.addNewSubsegment('child1');
      var child2 = segment.addNewSubsegment('child2');
      var stubStream1 = sandbox.stub(child1, 'streamSubsegments');
      var stubStream2 = sandbox.stub(child2, 'streamSubsegments');

      segment.incrementCounter();

      stubStream1.should.have.been.calledOnce;
      stubStream2.should.have.been.calledOnce;
    });

    it('should remove the subsegments streamed from the subsegments array', function() {
      SegmentUtils.setStreamingThreshold(0);
      var child1 = segment.addNewSubsegment('child1');
      var child2 = segment.addNewSubsegment('child2');
      var child3 = segment.addNewSubsegment('child3');
      var child4 = segment.addNewSubsegment('child4');
      var child5 = segment.addNewSubsegment('child5');
      var child6 = segment.addNewSubsegment('child6');
      sandbox.stub(child1, 'streamSubsegments').returns(true);
      sandbox.stub(child2, 'streamSubsegments');
      sandbox.stub(child3, 'streamSubsegments');
      sandbox.stub(child4, 'streamSubsegments').returns(true);
      sandbox.stub(child5, 'streamSubsegments');
      sandbox.stub(child6, 'streamSubsegments').returns(true);

      segment.incrementCounter();

      assert.deepEqual(segment.subsegments, [child2, child3, child5]);
    });
  });

  describe('#flush', function() {
    var err, sandbox, segment;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      segment = new Segment('test');
      err = new Error('Test error');
    });

    afterEach(function() {
      sandbox.restore();
      SegmentUtils.setStreamingThreshold(100);
    });

    describe('if traced', function() {
      it('should remove properties "notTraced", "counter" and "exception"', function() {
        var sendStub = sandbox.stub(SegmentEmitter, 'send');
        segment.notTraced = false;
        segment.in_progress = true;
        segment.exception = err;
        segment.counter = 1;

        segment.flush();

        sendStub.should.have.been.calledOnce;
        var sentSegment = sendStub.lastCall.args[0];
        assert.notProperty(sentSegment, 'exception');
        assert.notProperty(sentSegment, 'counter');
        assert.notProperty(sentSegment, 'notTraced');
      });

      it('should preserve prototype properties', function() {
        var sendStub = sandbox.stub(SegmentEmitter, 'send');
        segment.notTraced = false;
        segment.__proto__.prototypeProperty = 'testProperty';

        segment.flush();

        sendStub.should.have.been.calledOnce;
        var sentSegment = sendStub.lastCall.args[0];

        assert.property(sentSegment, 'prototypeProperty');
      });
    });
  });
});
