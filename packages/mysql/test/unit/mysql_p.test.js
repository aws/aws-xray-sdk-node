var assert = require('chai').assert;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var AWSXRay = require('aws-xray-sdk-core');

var captureMySQL = require('../../lib/mysql_p');
var Segment = AWSXRay.Segment;
var SqlData = AWSXRay.database.SqlData;
var TestEmitter = require('../test_utils').TestEmitter;

chai.should();
chai.use(sinonChai);

describe('captureMySQL', function() {
  var err = new Error('An error has been encountered.');

  describe('#captureMySQL', function() {
    it('should patch all the create functions the return the module', function() {
      var mysql = {
        createConnection: function() {},
        createPool: function() {},
        createPoolCluster: function() {}
      };

      var patched = captureMySQL(mysql);

      assert.property(patched, '__createConnection');
      assert.property(patched, '__createPool');

      assert.equal(patched.createConnection.name, 'patchedCreateConnection');
      assert.equal(patched.createPool.name, 'patchedCreatePool');
    });
  });

  describe('#captureQuery', function() {
    describe('for basic connections', function() {
      var conn, connectionObj, mysql, query, queryObj, sandbox, segment, stubAddNew, stubBaseQuery, subsegment;

      before(function() {
        conn = {
          config: {
            user: 'mcmuls',
            host: 'database.location',
            port: '8080',
            database: 'myTestDb'
          },
          query: function() {}
        };

        mysql = { createConnection: function() { return conn; } };
        mysql = captureMySQL(mysql);
        connectionObj = mysql.createConnection();
      });

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        segment = new Segment('test');
        subsegment = segment.addNewSubsegment('testSub');

        queryObj = new TestEmitter();
        queryObj.sql = 'sql statement here';
        queryObj.values = ['hello', 'there'];

        sandbox = sinon.sandbox.create();
        stubBaseQuery = sandbox.stub(connectionObj, '__query').returns(queryObj);
        sandbox.stub(AWSXRay, 'getSegment').returns(segment);
        stubAddNew = sandbox.stub(segment, 'addNewSubsegment').returns(subsegment);
        sandbox.stub(AWSXRay, 'isAutomaticMode').returns(true);
        query = connectionObj.query;
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should create a new subsegment using database and host', function() {
        var config = conn.config;
        query.call(connectionObj, 'sql here');

        stubAddNew.should.have.been.calledWithExactly(config.database + '@' + config.host);
      });

      it('should add the sql data to the subsegment', function() {
        var stubAddSql = sandbox.stub(subsegment, 'addSqlData');
        var stubDataInit = sandbox.stub(SqlData.prototype, 'init');
        var config = conn.config;

        query.call(connectionObj, 'sql here');

        stubDataInit.should.have.been.calledWithExactly(undefined, undefined, config.user,
          config.host + ':' + config.port + '/' + config.database, 'statement');
        stubAddSql.should.have.been.calledWithExactly(sinon.match.instanceOf(SqlData));
      });

      it('should start a new automatic context and close the subsegment via the callback if supplied', function(done) {
        var stubClose = sandbox.stub(subsegment, 'close');
        var session = { run: function(fcn) { fcn(); }};
        var stubRun = sandbox.stub(session, 'run');

        sandbox.stub(AWSXRay, 'getNamespace').returns(session);
        query.call(connectionObj, 'sql here', function() {});

        stubBaseQuery.should.have.been.calledWith(sinon.match.string, null, sinon.match.func);
        assert.equal(stubBaseQuery.args[0][2].name, 'autoContext');
        stubBaseQuery.args[0][2].call(queryObj);

        setTimeout(function() {
          stubClose.should.always.have.been.calledWith();
          stubRun.should.have.been.calledOnce;
          done();
        }, 50);
      });

      it('should capture the error via the callback if supplied', function(done) {
        var stubClose = sandbox.stub(subsegment, 'close');

        query.call(connectionObj, 'sql here', function() {});
        stubBaseQuery.args[0][2].call(queryObj, err);

        setTimeout(function() {
          stubClose.should.have.been.calledWithExactly(err);
          done();
        }, 50);
      });

      it('should close the subsegment via the event if the callback is missing', function() {
        var stubClose = sandbox.stub(subsegment, 'close');
        query.call(connectionObj);

        queryObj.emit('end');
        stubClose.should.always.have.been.calledWithExactly();
      });

      it('should capture the error via the event if the callback is missing', function() {
        var stubClose = sandbox.stub(subsegment, 'close');
        query.call(connectionObj);

        assert.throws(function() {
          queryObj.emit('error', err);
        });

        stubClose.should.have.been.calledWithExactly(err);
      });
    });
  });
});
