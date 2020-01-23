var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var CapturedException = require('../../../../lib/segments/attributes/captured_exception');
var SegmentEmitter = require('../../../../lib/segment_emitter');
var SegmentUtils = require('../../../../lib/segments/segment_utils');
var Subsegment = require('../../../../lib/segments/attributes/subsegment');

chai.should();
chai.use(sinonChai);

var dgram = require('dgram');

describe('Subsegment', function() {
  describe('#init', function() {
    it('should set the required attributes', function() {
      var subsegment = new Subsegment('foo');

      var expected = new RegExp('^([a-f0-9]{16})$');
      assert.match(subsegment.id, expected);

      assert.property(subsegment, 'start_time');
      assert.propertyVal(subsegment, 'name', 'foo');
      assert.propertyVal(subsegment, 'in_progress', true);
      assert.propertyVal(subsegment, 'counter', 0);
    });
  });

  describe('#addMetadata', function() {
    var key, subsegment, value;

    beforeEach(function() {
      subsegment = new Subsegment('test');
      key = 'key';
      value = [1, 2, 3];
    });

    it('should add key value pair to metadata.default if no namespace is supplied', function() {
      subsegment.addMetadata(key, value);
      assert.propertyVal(subsegment.metadata.default, key, value);
    });

    it('should add key value pair to metadata[namespace] if a namespace is supplied', function() {
      var namespace = 'hello';
      subsegment.addMetadata(key, value, 'hello');
      assert.propertyVal(subsegment.metadata[namespace], key, value);
    });
  });

  describe('#addSubsegment', function() {
    var child, incrementStub, subsegment, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      subsegment = new Subsegment('test');
      child = new Subsegment('child');
      incrementStub = sandbox.stub(subsegment, 'incrementCounter');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should throw an error if trying to add a non-subsegment', function() {
      assert.throws( function() { subsegment.addSubsegment({ key: 'x' }); }, Error);
    });

    it('should add the new subsegment to the subsegments array' , function() {
      subsegment.addSubsegment(child);
      assert.equal(subsegment.subsegments[0], child);
    });

    it('should set the parent and segment properties', function() {
      subsegment.segment = 'segment';
      subsegment.addSubsegment(child);
      assert.equal(child.parent, subsegment);
      assert.equal(child.segment, subsegment.segment);
    });

    it('should call to increment the counter with count from subsegment', function() {
      child.counter = 10;
      subsegment.addSubsegment(child);

      incrementStub.should.have.been.calledWith(10);
    });

    it('should not call to increment the counter if the subsegment is closed', function() {
      child.close();
      subsegment.addSubsegment(child);

      incrementStub.should.have.not.been.called;
    });
  });

  describe('#addError', function() {
    var err, exceptionStub, sandbox, subsegment;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      exceptionStub = sandbox.stub(CapturedException.prototype, 'init');

      subsegment = new Subsegment('test');
      err = new Error('Test error');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should accept an object or string', function() {
      subsegment.addError(err);
      subsegment.addError('error');
      assert.equal(subsegment.cause.exceptions.length, 2);
    });

    it('should throw an error on other types', function() {
      assert.throws(function() { subsegment.addError(3); });
    });

    it('should set fault to true by default', function() {
      subsegment.addError(err);
      assert.equal(subsegment.fault, true);
    });

    it('should add the cause property with working directory data', function() {
      subsegment.addError(err);
      assert.property(subsegment.cause, 'working_directory');
    });

    it('should add a new captured exception', function() {
      subsegment.addError(err, true);
      exceptionStub.should.have.been.calledWithExactly(err, true);
    });
  });

  describe('#incrementCounter', function() {
    var sandbox, stubIncrementParent, subsegment;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      subsegment = new Subsegment('test');
      subsegment.parent = { incrementCounter: function() {} };

      stubIncrementParent = sandbox.stub(subsegment.parent, 'incrementCounter');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should increment the counter and parent', function() {
      subsegment.incrementCounter();

      assert.equal(subsegment.counter, 1);
      stubIncrementParent.should.have.been.calledWith();
    });

    it('should increment the counter and parent plus additional when provided', function() {
      var additional = 4;
      subsegment.incrementCounter(additional);

      assert.equal(subsegment.counter, additional + 1);
      stubIncrementParent.should.have.been.calledWith(additional);
    });
  });

  describe('#close', function() {
    var sandbox, segment, stubSegmentDecrement, stubSegmentRemove, stubSubsegmentStream, subsegment;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      segment = {
        parent_id: '12345abc3456def',
        counter: 1,
        decrementCounter: function() {},
        removeSubsegment: function() {},
        isClosed: function() {}
      };

      stubSegmentDecrement = sandbox.stub(segment, 'decrementCounter');
      stubSegmentRemove = sandbox.stub(segment, 'removeSubsegment');

      subsegment = new Subsegment('child');
      subsegment.parent = segment;
      subsegment.segment = segment;
      stubSubsegmentStream = sandbox.stub(subsegment, 'streamSubsegments').returns(true);
    });

    afterEach(function() {
      sandbox.restore();
      SegmentUtils.setStreamingThreshold(100);
    });

    it('should set the end time', function() {
      subsegment.close();
      assert.property(subsegment, 'end_time');
    });

    it('should decrement the parent counter', function() {
      subsegment.close();
      stubSegmentDecrement.should.have.been.calledOnce;
    });

    it('should delete the in_progress attribute', function() {
      subsegment.close();
      assert.notProperty(subsegment, 'in_progress');
    });

    it('should call streamSubsegments if the parent counter is higher than the threshold', function() {
      SegmentUtils.setStreamingThreshold(0);
      subsegment.close();

      stubSubsegmentStream.should.have.been.calledOnce;
    });

    it('should remove itself from the parent if it was streamed', function() {
      SegmentUtils.setStreamingThreshold(0);
      subsegment.close();

      stubSegmentRemove.should.have.been.calledWith(subsegment);
    });
  });

  describe('#flush', function() {
    var child, emitStub, parent, sandbox, segment;
    // Since SegmentEmitter is reused across tests, we need the emitStub
    // to also persist across tests
    emitStub = sinon.stub();

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      segment = { trace_id: '1-58c835af-cf6bfe9f8f2c5b84a6d1f50c', parent_id: '12345abc3456def' };
      parent = new Subsegment('test');

      sandbox.stub(dgram, 'createSocket').returns({
        send: emitStub,
        unref: sinon.stub().returnsThis()
      });

      child = parent.addNewSubsegment('child');
      child.segment = segment;
    });

    afterEach(function() {
      sandbox.restore();
      emitStub.reset();
    });

    it('should throw an error if the subsegment has no parent', function() {
      delete child.parent;
      assert.throws( function() { child.flush(); }, Error);
    });

    it('should throw an error if the subsegment has no segment', function() {
      delete child.segment;
      assert.throws( function() { child.flush(); }, Error);
    });

    it('should set the parent_id, trace_id and type properties', function() {
      child.flush();
      assert.equal(child.type, 'subsegment');
      assert.equal(child.parent_id, parent.id);
      assert.equal(child.trace_id, segment.trace_id);
    });

    it('should not send if the notTraced property evaluates to true', function() {
      segment.notTraced = true;
      child.flush();
      emitStub.should.have.not.been.called;
    });

    it('should send if the notTraced property evaluates to false', function() {
      child.flush();
      emitStub.should.have.been.called;
    });
  });

  describe('#streamSubsegments', function() {
    var child1, parent, sandbox, stubFlush, stubStream1;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      parent = new Subsegment('parent');
      child1 = parent.addNewSubsegment('child');

      stubFlush = sandbox.stub(parent, 'flush');
      stubStream1 = sandbox.stub(child1, 'streamSubsegments');
    });

    afterEach(function() {
      sandbox.restore();
      SegmentUtils.setStreamingThreshold(100);
    });

    describe('if the subsegment is closed and has no open subsegments', function() {
      it('should flush itself', function() {
        child1.close();
        parent.close();
        parent.streamSubsegments();

        stubFlush.should.have.been.calledOnce;
      });

      it('should return true', function() {
        child1.close();
        parent.close();

        assert.isTrue(parent.streamSubsegments());
      });
    });

    describe('if the subsegment not closed or it has open subsegments', function() {
      it('should call streamSubsegment on each child subsegment', function() {
        var child2 = parent.addNewSubsegment('child2');
        var child3 = parent.addNewSubsegment('child3');
        var stubStream2 = sandbox.stub(child2, 'streamSubsegments');
        var stubStream3 = sandbox.stub(child3, 'streamSubsegments');
        parent.streamSubsegments();

        stubStream1.should.have.been.calledOnce;
        stubStream2.should.have.been.calledOnce;
        stubStream3.should.have.been.calledOnce;
      });

      it('should remove the closed subsegments from the subsegment array', function() {
        var child2 = parent.addNewSubsegment('child2');
        var child3 = parent.addNewSubsegment('child3');
        var child4 = parent.addNewSubsegment('child4');
        var child5 = parent.addNewSubsegment('child5');
        var child6 = parent.addNewSubsegment('child6');
        stubStream1.returns(true);
        sandbox.stub(child2, 'streamSubsegments');
        sandbox.stub(child3, 'streamSubsegments');
        sandbox.stub(child4, 'streamSubsegments').returns(true);
        sandbox.stub(child5, 'streamSubsegments');
        sandbox.stub(child6, 'streamSubsegments').returns(true);
        parent.streamSubsegments();

        assert.deepEqual(parent.subsegments, [child2, child3, child5]);
      });
    });
  });
});
