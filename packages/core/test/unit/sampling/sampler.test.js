var times = require('lodash/times');
var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');

var Sampler = require('../../../lib/middleware/sampling/sampler');

describe('Sampler', function() {
  describe('#constructor', function() {
    it('should return a new Sampler with fixed target and rate set', function() {
      var sampler = new Sampler(5, 0.5);

      assert(!isNaN(sampler.fixedTarget), 'Expected fixed target to be a number.');
      assert(!isNaN(sampler.fallbackRate), 'Expected rate to be a number.');
    });

    it('should throw an exception if fixed target is a float or a negative number', function() {
      expect(function() { new Sampler(123.45, 0.5); }).to.throw(Error, '"fixed_target" must be a non-negative integer.');
      expect(function() { new Sampler(-123, 0.5); }).to.throw(Error, '"fixed_target" must be a non-negative integer.');
    });

    it('should throw an exception if rate is not a number between 0 and 1', function() {
      expect(function() { new Sampler(5, 123); }).to.throw(Error, '"rate" must be a number between 0 and 1 inclusive.');
      expect(function() { new Sampler(5, -0.5); }).to.throw(Error, '"rate" must be a number between 0 and 1 inclusive.');
    });
  });

  describe('#isSampled', function() {
    var sandbox, sampler;
    var fixedTarget = 5;

    before(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(Math, 'round').returns(1);
    });

    beforeEach(function() {
      sampler = new Sampler(fixedTarget, 0);
    });

    after(function() {
      sandbox.restore();
    });

    it('should return true up to the fixed target set.', function() {
      times(fixedTarget, function() {
        assert.isTrue(sampler.isSampled());
      });

      assert.isFalse(sampler.isSampled());
    });

    it('should call Math.random and use the rate set if the fixed target has already been reached.', function() {
      sampler.thisSecond = 1;
      sampler.usedThisSecond = 5;
      var randomStub = sandbox.stub(Math, 'random').returns(1);

      sampler.isSampled();
      randomStub.should.have.been.calledOnce;
    });
  });
});
