var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');

var LocalReservoir = require('../../../lib/middleware/sampling/local_reservoir');

describe('LocalReservoir', function() {
  describe('#constructor', function() {
    it('should return a new Sampler with fixed target and rate set', function() {
      var localReservoir = new LocalReservoir(5, 0.5);

      assert(!isNaN(localReservoir.fixedTarget), 'Expected fixed target to be a number.');
      assert(!isNaN(localReservoir.fallbackRate), 'Expected rate to be a number.');
    });

    it('should throw an exception if fixed target is a float or a negative number', function() {
      expect(function() { new LocalReservoir(123.45, 0.5); }).to.throw(Error, '"fixed_target" must be a non-negative integer.');
      expect(function() { new LocalReservoir(-123, 0.5); }).to.throw(Error, '"fixed_target" must be a non-negative integer.');
    });

    it('should throw an exception if rate is not a number between 0 and 1', function() {
      expect(function() { new LocalReservoir(5, 123); }).to.throw(Error, '"rate" must be a number between 0 and 1 inclusive.');
      expect(function() { new LocalReservoir(5, -0.5); }).to.throw(Error, '"rate" must be a number between 0 and 1 inclusive.');
    });
  });

  describe('#isSampled', function() {
    var sandbox, localReservoir;
    var fixedTarget = 5;

    before(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(Math, 'round').returns(1);
    });

    beforeEach(function() {
      localReservoir = new LocalReservoir(fixedTarget, 0);
    });

    after(function() {
      sandbox.restore();
    });

    it('should return true up to the fixed target set.', function() {
      for (var i = 0; i < fixedTarget; i++) {
        assert.isTrue(localReservoir.isSampled());
      }

      assert.isFalse(localReservoir.isSampled());
    });

    it('should call Math.random and use the rate set if the fixed target has already been reached.', function() {
      localReservoir.thisSecond = 1;
      localReservoir.usedThisSecond = 5;
      var randomStub = sandbox.stub(Math, 'random').returns(1);

      localReservoir.isSampled();
      randomStub.should.have.been.calledOnce;
    });
  });
});
