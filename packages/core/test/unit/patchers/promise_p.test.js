const expect = require('chai').expect;
const sinon = require('sinon');

const { capturePromise } = require('../../../lib/patchers/promise_p');
const contextUtils = require('../../../lib/context_utils');

const origThen = Promise.prototype.then;
const origCatch = Promise.prototype.catch;

const sandbox = sinon.createSandbox();
const getNamespaceStub = sandbox.stub(contextUtils, 'getNamespace');
const isAutomaticModeStub = sandbox.stub(contextUtils, 'isAutomaticMode');
const getSegmentStub = sandbox.stub(contextUtils, 'getSegment');
const bindStub = sandbox.stub();

beforeEach(() => {
  bindStub.returnsArg(0);
  getNamespaceStub.returns({
    bind: bindStub
  });
});

afterEach(() => {
  sandbox.reset();
  Promise.prototype.then = origThen;
  Promise.prototype.catch = origCatch;
});

after(() => {
  sandbox.restore();
});

function verifyBindings (shouldCapture, onFulfilled, onRejected) {
  if (shouldCapture) {
    if (onFulfilled) {
      sinon.assert.calledWith(bindStub, onFulfilled);
    }
    if (onRejected) {
      sinon.assert.calledWith(bindStub, onRejected);
    }
  } else {
    sinon.assert.notCalled(bindStub);
  }
}

function testThenOnFulfilled(shouldCapture) {
  const onFulfilled = result => {
    expect(result).to.equal('resolved');
    verifyBindings(shouldCapture, onFulfilled);
  };
  return new Promise((resolve) => {
    setTimeout(() => resolve('resolved'), 200);
  }).then(onFulfilled);
}

function testThenOnRejected(shouldCapture, hasOnFulfilled = true) {
  const onFulfilled = hasOnFulfilled ? () => {
    throw new Error('Not rejected');
  } : undefined;

  const onRejected = error => {
    expect(error.message).to.equal('rejected');
    verifyBindings(shouldCapture, onFulfilled, onRejected);
  };
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('rejected')), 200);
  }).then(onFulfilled, onRejected);
}

function testCatch(shouldCapture) {
  const onRejected = error => {
    verifyBindings(shouldCapture, undefined, onRejected);
    expect(error.message, 'rejected');
  };
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('rejected')), 200);
  }).catch(onRejected);
}

function createTests(shouldCapture) {
  it('Promise.prototype.then', async () => {
    capturePromise();
    expect(Promise.prototype.then).not.to.equal(origThen);
    await testThenOnFulfilled(shouldCapture);
    await testThenOnRejected(shouldCapture);
    await testThenOnRejected(shouldCapture, false);
  });

  it('Promise.prototype.catch', async () => {
    capturePromise();
    expect(Promise.prototype.catch).not.to.equal(origCatch);
    await testCatch(shouldCapture);
  });
}

describe('capturePromise', () => {
  describe('no segment', () => {
    beforeEach(() => {
      getSegmentStub.throws('No segment');
      isAutomaticModeStub.returns(true);
    });

    createTests(false);
  });

  describe('not automaticMode', () => {
    beforeEach(() => {
      getSegmentStub.returns({});
      isAutomaticModeStub.returns(false);
    });

    createTests(false);
  });

  describe('binds methods', () => {
    beforeEach(() => {
      getSegmentStub.returns({});
      isAutomaticModeStub.returns(true);
    });
    createTests(true);
  });
});

describe('capturePromise.patchThirdPartyPromise', () => {
  class FakePromise {
  }
  function fakeOrigThen () {}
  function fakeOrigCatch () {}

  beforeEach(() => {
    FakePromise.prototype.then = fakeOrigThen;
    FakePromise.prototype.catch = fakeOrigCatch;
  });

  it('wraps the provided Promise lib then function', () => {
    capturePromise.patchThirdPartyPromise(FakePromise);
    expect(Promise.prototype.then).to.equal(origThen);
    expect(FakePromise.prototype.then).not.to.equal(fakeOrigThen);
  });

  it('wraps the provided Promise lib then function', () => {
    capturePromise.patchThirdPartyPromise(FakePromise);
    expect(Promise.prototype.catch).to.equal(origCatch);
    expect(FakePromise.prototype.catch).not.to.equal(fakeOrigCatch);
  });
});
