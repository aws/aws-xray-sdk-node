var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var AWSXRay = require('aws-xray-sdk-core');

var capturePostgres = require('../../lib/postgres_p');
var Segment = AWSXRay.Segment;
var SqlData = AWSXRay.database.SqlData;
var TestEmitter = require('../test_utils').TestEmitter;

chai.should();
chai.use(sinonChai);

describe('capturePostgres', function() {
  var err = new Error('An error has been encountered.');

  describe('#capturePostgres', function() {
    it('should patch the query function the return the module', function() {
      var postgres = { Client: { prototype: {query: function () {} }}};
      postgres = capturePostgres(postgres);
      assert.equal(postgres.Client.prototype.query.name, 'captureQuery');
    });
  });

  describe('#captureQuery', function() {
    var postgres, query, queryObj, sandbox, segment, stubAddNew, subsegment;

    before(function() {
      postgres = { Client: { prototype: {
        query: function () {},
        host: 'database.location',
        database: 'myTestDb',
        connectionParameters: {
          user: 'mcmuls',
          host: 'database.location',
          port: '8080',
          database: 'myTestDb'
        }
      }}};
      postgres = capturePostgres(postgres);

      query = postgres.Client.prototype.query;
      postgres = postgres.Client.prototype;
    });

    beforeEach(function() {
      segment = new Segment('test');
      subsegment = segment.addNewSubsegment('testSub');

      queryObj = new TestEmitter();
      queryObj.text = 'sql statement here';
      queryObj.values = ['hello', 'there'];

      sandbox = sinon.sandbox.create();
      sandbox.stub(postgres, '__query').returns(queryObj);
      sandbox.stub(AWSXRay, 'getSegment').returns(segment);
      stubAddNew = sandbox.stub(segment, 'addNewSubsegment').returns(subsegment);
      sandbox.stub(AWSXRay, 'isAutomaticMode').returns(true);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should create a new subsegment using database and host', function() {
      query.call(postgres);

      stubAddNew.should.have.been.calledWithExactly(postgres.database + '@' + postgres.host);
    });

    it('should add the sql data to the subsegment', function() {
      var stubAddSql = sandbox.stub(subsegment, 'addSqlData');
      var stubDataInit = sandbox.stub(SqlData.prototype, 'init');
      var conParam = postgres.connectionParameters;

      query.call(postgres);

      stubDataInit.should.have.been.calledWithExactly(undefined, undefined, conParam.user,
        conParam.host + ':' + conParam.port + '/' + conParam.database, undefined);
      stubAddSql.should.have.been.calledWithExactly(sinon.match.instanceOf(SqlData));
    });

    it('should start a new automatic context and close the subsegment via the callback if supplied', function(done) {
      var stubClose = sandbox.stub(subsegment, 'close');
      var session = { run: function(fcn) { fcn(); }};
      var stubRun = sandbox.stub(session, 'run');

      sandbox.stub(AWSXRay, 'getNamespace').returns(session);

      queryObj.callback = function() {};

      query.call(postgres);
      assert.equal(queryObj.callback.name, 'autoContext');
      queryObj.callback();

      setTimeout(function() {
        stubClose.should.always.have.been.calledWith(undefined);
        stubRun.should.have.been.calledOnce;
        done();
      }, 50);
    });

    it('should capture the error via the callback if supplied', function(done) {
      var stubClose = sandbox.stub(subsegment, 'close');
      queryObj.callback = function() {};

      query.call(postgres);
      queryObj.callback(err);

      setTimeout(function() {
        stubClose.should.have.been.calledWithExactly(err);
        done();
      }, 50);
    });

    it('should close the subsegment via the event if the callback is missing', function() {
      var stubClose = sandbox.stub(subsegment, 'close');
      query.call(postgres);

      queryObj.emit('end');
      stubClose.should.always.have.been.calledWithExactly();
    });

    it('should capture the error via the event if the callback is missing', function() {
      var stubClose = sandbox.stub(subsegment, 'close');
      query.call(postgres);

      assert.throws(function() {
        queryObj.emit('error', err);
      });

      stubClose.should.have.been.calledWithExactly(err);
    });
  });
});
