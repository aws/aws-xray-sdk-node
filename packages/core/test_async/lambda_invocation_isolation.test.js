var assert = require('chai').assert;
var sinon = require('sinon');
var AWSXRay = require('../lib');
var contextUtils = require('../lib/context_utils');
var Lambda = require('../lib/env/aws_lambda');
var mwUtils = require('../lib/middleware/mw_utils');
var SegmentEmitter = require('../lib/segment_emitter');
var SegmentUtils = require('../lib/segments/segment_utils');

var ROOT_A = '1-5f0000aa-0000000000000000000000aa';
var ROOT_B = '1-5f0000bb-0000000000000000000000bb';
var TRACE_A = 'Root=' + ROOT_A + ';Parent=00000000000000aa;Sampled=1;Lineage=aaaaaaaa:1';
var TRACE_B = 'Root=' + ROOT_B + ';Parent=00000000000000bb;Sampled=1';
var TRACE_B_UNSAMPLED = 'Root=' + ROOT_B + ';Parent=00000000000000bb;Sampled=0';

// Every participant must arrive before any resumes. No timer controls the overlap.
function barrier(count) {
  var release;
  var ready = new Promise(function(resolve) {
    release = resolve;
  });
  return function() {
    if (--count === 0) {
      release();
    }
    return ready;
  };
}

function nextTurn() {
  return new Promise(function(resolve) {
    setImmediate(resolve);
  });
}

describe('Lambda invocation isolation', function() {
  var sandbox, invokeStore, protectedKeys, namespace, lambdaContext, legacyFacade;
  var documents, previousGlobal, previousManualMode, previousThreshold;
  var previousEnv = {};
  var envNames = ['LAMBDA_TASK_ROOT', '_X_AMZN_TRACE_ID', 'AWS_LAMBDA_BENCHMARK_MODE', 'AWS_LAMBDA_MAX_CONCURRENCY'];

  before(async function() {
    envNames.forEach(function(name) {
      previousEnv[name] = process.env[name];
    });
    previousGlobal = globalThis.awslambda;
    previousManualMode = contextUtils.enableManualMode;
    previousThreshold = SegmentUtils.getStreamingThreshold();
    process.env.LAMBDA_TASK_ROOT = '/var/task';
    process.env.AWS_LAMBDA_BENCHMARK_MODE = '1';
    process.env.AWS_LAMBDA_MAX_CONCURRENCY = '2';
    delete process.env._X_AMZN_TRACE_ID;

    var storeModule = await import('@aws/lambda-invoke-store');
    storeModule.InvokeStore._testing.reset();
    invokeStore = await storeModule.InvokeStore.getInstanceAsync();
    protectedKeys = storeModule.InvokeStoreBase.PROTECTED_KEYS;

    sandbox = sinon.createSandbox();
    sandbox.stub(SegmentEmitter, 'disableReusableSocket');
    sandbox.stub(mwUtils, 'disableCentralizedSampling');
    sandbox.stub(SegmentEmitter, 'send').callsFake(function(segment) {
      documents.push(JSON.parse(segment.format()));
    });
    AWSXRay.enableAutomaticMode();
    namespace = AWSXRay.getNamespace();
    Lambda.init();
    lambdaContext = namespace.active;
    legacyFacade = namespace.get('segment');
  });

  beforeEach(function() {
    documents = [];
  });

  after(function() {
    sandbox.restore();
    namespace.exit(lambdaContext);
    contextUtils.enableManualMode = previousManualMode;
    SegmentUtils.setStreamingThreshold(previousThreshold);
    globalThis.awslambda = previousGlobal;
    envNames.forEach(function(name) {
      if (previousEnv[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousEnv[name];
      }
    });
  });

  function invocation(traceHeader, fn) {
    return invokeStore.run({ [protectedKeys.X_RAY_TRACE_ID]: traceHeader }, fn);
  }

  it('isolates manual active segments, annotations, metadata and emitted parents across native awaits and callbacks', async function() {
    var overlap = barrier(2);
    // The promise and continuation exist before either invocation first uses X-Ray.
    var ready = Promise.resolve();
    async function handler(name, root, parent) {
      await ready;
      var facade = AWSXRay.getSegment();
      var subsegment = facade.addNewSubsegment(name);
      AWSXRay.setSegment(subsegment);
      await overlap();
      assert.strictEqual(AWSXRay.getSegment(), subsegment);
      await new Promise(function(resolve, reject) {
        setImmediate(function() {
          try {
            assert.strictEqual(AWSXRay.getSegment(), subsegment);
            AWSXRay.getSegment().addAnnotation('invocation', name);
            AWSXRay.getSegment().addMetadata('owner', { name: name });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
      assert.strictEqual(subsegment.parent, facade);
      assert.equal(facade.trace_id, root);
      assert.equal(facade.id, parent);
      subsegment.close();
      AWSXRay.setSegment(facade);
      assert.strictEqual(AWSXRay.getSegment(), facade);
      return facade;
    }
    var facades = await Promise.all([
      invocation(TRACE_A, function() {
        return handler('A', ROOT_A, '00000000000000aa');
      }),
      invocation(TRACE_B, function() {
        return handler('B', ROOT_B, '00000000000000bb');
      })
    ]);
    assert.notStrictEqual(facades[0], facades[1]);
    assert.lengthOf(documents, 2);
    documents.forEach(function(document) {
      assert.equal(document.annotations.invocation, document.name);
      assert.deepEqual(document.metadata.default.owner, { name: document.name });
      assert.equal(document.trace_id, document.name === 'A' ? ROOT_A : ROOT_B);
      assert.equal(document.parent_id, document.name === 'A' ? '00000000000000aa' : '00000000000000bb');
    });
  });

  it('preserves parallel and nested capture scopes and restores their caller independently in each invocation', async function() {
    var overlap = barrier(2);
    async function handler(name) {
      var facade = AWSXRay.getSegment();
      await AWSXRay.captureAsyncFunc(name, async function(outer) {
        await overlap();
        assert.strictEqual(AWSXRay.getSegment(), outer);
        outer.addAnnotation('owner', name);
        var siblings = barrier(2);
        await Promise.all(['left', 'right'].map(function(childName) {
          return AWSXRay.captureAsyncFunc(name + '-' + childName, async function(child) {
            assert.strictEqual(child.parent, outer);
            await siblings();
            await nextTurn();
            assert.strictEqual(AWSXRay.getSegment(), child);
            child.addAnnotation('owner', name);
            AWSXRay.captureFunc('nested', function(nested) {
              assert.strictEqual(nested.parent, child);
              assert.strictEqual(AWSXRay.getSegment(), nested);
              nested.addAnnotation('owner', name);
            });
            assert.strictEqual(AWSXRay.getSegment(), child);
            child.close();
          });
        }));
        assert.strictEqual(AWSXRay.getSegment(), outer);
        outer.close();
      });
      assert.strictEqual(AWSXRay.getSegment(), facade);
    }
    await Promise.all([
      invocation(TRACE_A, function() {
        return handler('A');
      }),
      invocation(TRACE_B, function() {
        return handler('B');
      })
    ]);
    assert.lengthOf(documents, 10);
    documents.forEach(function(document) {
      assert.equal(document.trace_id, document.annotations.owner === 'A' ? ROOT_A : ROOT_B);
    });
  });

  it('does not lose sampled work or inherit errors when an unsampled invocation interleaves before flushing', async function() {
    var opened = barrier(2);
    var error = new Error('only invocation A failed');
    await Promise.all([
      invocation(TRACE_A, async function() {
        var facade = AWSXRay.getSegment();
        var work = facade.addNewSubsegment('sampled');
        await opened();
        await nextTurn();
        work.close(error);
        assert.equal(facade.exception.ex, error);
      }),
      invocation(TRACE_B_UNSAMPLED, async function() {
        var facade = AWSXRay.getSegment();
        var work = facade.addNewSubsegment('unsampled');
        await opened();
        await nextTurn();
        work.close();
        assert.isUndefined(facade.exception);
        assert.deepEqual(facade.additionalTraceData, {});
      })
    ]);
    assert.lengthOf(documents, 1);
    assert.equal(documents[0].name, 'sampled');
    assert.equal(documents[0].trace_id, ROOT_A);
    assert.equal(documents[0].parent_id, '00000000000000aa');
    assert.isTrue(documents[0].fault);
    assert.equal(documents[0].cause.exceptions[0].message, error.message);
  });

  it('uses invocation identity even when separate invocations have identical trace headers', async function() {
    var overlap = barrier(2);
    var facades = await Promise.all([1, 2].map(function(index) {
      return invocation(TRACE_A, async function() {
        var facade = AWSXRay.getSegment();
        var work = facade.addNewSubsegment('work-' + index);
        AWSXRay.setSegment(work);
        await overlap();
        assert.strictEqual(AWSXRay.getSegment(), work);
        work.close();
        AWSXRay.setSegment(facade);
        return facade;
      });
    }));
    assert.notStrictEqual(facades[0], facades[1]);
    assert.equal(facades[0].trace_id, ROOT_A);
    assert.equal(facades[1].trace_id, ROOT_A);
    assert.lengthOf(documents, 2);
  });

  it('starts the next invocation with a fresh facade even if the previous handler left its active segment set', async function() {
    var oldFacade;
    await invocation(TRACE_A, async function() {
      oldFacade = AWSXRay.getSegment();
      AWSXRay.setSegment(oldFacade.addNewSubsegment('unfinished'));
      await nextTurn();
    });
    await invocation(TRACE_B, async function() {
      var facade = AWSXRay.getSegment();
      assert.isTrue(facade.facade);
      assert.notStrictEqual(facade, oldFacade);
      assert.equal(facade.trace_id, ROOT_B);
      assert.isUndefined(facade.subsegments);
      assert.isUndefined(facade.exception);
      assert.deepEqual(facade.additionalTraceData, {});
      await nextTurn();
      assert.strictEqual(AWSXRay.getSegment(), facade);
    });
    assert.isUndefined(invokeStore.getContext());
  });

  it('restores capture context after a thrown exception without leaking it into a peer invocation', async function() {
    var overlap = barrier(2);
    await Promise.all([TRACE_A, TRACE_B].map(function(trace) {
      return invocation(trace, async function() {
        var facade = AWSXRay.getSegment();
        await overlap();
        assert.throws(function() {
          AWSXRay.captureFunc('throws', function(current) {
            assert.strictEqual(AWSXRay.getSegment(), current);
            throw new Error(trace);
          });
        }, trace);
        assert.strictEqual(AWSXRay.getSegment(), facade);
      });
    }));
    assert.lengthOf(documents, 2);
    documents.forEach(function(document) {
      assert.isTrue(document.fault);
    });
  });

  it('keeps captured callbacks on their invocation after a peer has resolved its facade', async function() {
    var overlap = barrier(2);
    await Promise.all([TRACE_A, TRACE_B].map(function(trace) {
      return invocation(trace, async function() {
        var facade = AWSXRay.getSegment();
        var callback = AWSXRay.captureCallbackFunc('callback', function(value, current) {
          assert.equal(value, trace);
          assert.strictEqual(current.parent, facade);
          assert.strictEqual(AWSXRay.getSegment(), current);
          current.addAnnotation('owner', trace);
        });
        await overlap();
        await new Promise(function(resolve, reject) {
          setImmediate(function() {
            try {
              callback(trace);
              assert.strictEqual(AWSXRay.getSegment(), facade);
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });
      });
    }));
    assert.lengthOf(documents, 2);
    documents.forEach(function(document) {
      assert.equal(document.trace_id, document.annotations.owner === TRACE_A ? ROOT_A : ROOT_B);
    });
  });

  it('stores invocation segments even when the calling async resource has no active CLS context', function() {
    var active = namespace.active;
    namespace.active = null;
    try {
      var facades = [TRACE_A, TRACE_B].map(function(trace) {
        return invocation(trace, function() {
          var facade = AWSXRay.getSegment();
          var work = facade.addNewSubsegment('without-cls');
          AWSXRay.setSegment(work);
          assert.strictEqual(AWSXRay.getSegment(), work);
          AWSXRay.captureFunc('captured', function(current) {
            assert.strictEqual(current.parent, work);
            assert.strictEqual(AWSXRay.getSegment(), current);
          });
          assert.strictEqual(AWSXRay.getSegment(), work);
          work.close();
          AWSXRay.setSegment(facade);
          return facade;
        });
      });
      assert.notStrictEqual(facades[0], facades[1]);
      assert.equal(facades[0].trace_id, ROOT_A);
      assert.equal(facades[1].trace_id, ROOT_B);
    } finally {
      namespace.active = active;
    }
  });

  it('initializes Lambda inside an invocation without copying startup trace metadata into its facade', function() {
    process.env._X_AMZN_TRACE_ID = TRACE_A;
    try {
      invocation(TRACE_B, function() {
        var active = namespace.active;
        Lambda.init();
        try {
          var facade = AWSXRay.getSegment();
          assert.equal(facade.trace_id, ROOT_B);
          assert.equal(facade.id, '00000000000000bb');
          assert.deepEqual(facade.additionalTraceData, {});
          assert.isUndefined(facade.noOp);
        } finally {
          namespace.exit(namespace.active);
          assert.strictEqual(namespace.active, active);
        }
      });
    } finally {
      delete process.env._X_AMZN_TRACE_ID;
    }
  });

  it('retains the ordinary Lambda CLS lifecycle when InvokeStore is absent', function() {
    return namespace.runAndReturn(async function() {
      var runtime = globalThis.awslambda;
      delete globalThis.awslambda;
      process.env._X_AMZN_TRACE_ID = TRACE_A;
      try {
        AWSXRay.setSegment(legacyFacade);
        var facade = AWSXRay.getSegment();
        assert.isTrue(facade.facade);
        assert.equal(facade.trace_id, ROOT_A);
        var work = facade.addNewSubsegment('legacy');
        AWSXRay.setSegment(work);
        await nextTurn();
        assert.strictEqual(AWSXRay.getSegment(), work);
        work.close();
        AWSXRay.setSegment(facade);
        process.env._X_AMZN_TRACE_ID = TRACE_B;
        assert.strictEqual(AWSXRay.getSegment(), facade);
        assert.equal(facade.trace_id, ROOT_B);
        assert.lengthOf(documents, 1);
        assert.equal(documents[0].trace_id, ROOT_A);
      } finally {
        globalThis.awslambda = runtime;
        delete process.env._X_AMZN_TRACE_ID;
      }
    });
  });
});
