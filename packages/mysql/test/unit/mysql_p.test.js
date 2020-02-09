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
      assert.property(patched, '__createPoolCluster');

      assert.equal(patched.createConnection.name, 'patchedCreateConnection');
      assert.equal(patched.createPool.name, 'patchedCreatePool');
      assert.equal(patched.createPoolCluster.name, 'patchedCreatePoolCluster');
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

      it('should pass timeout to basequery if supplied', function (done) {
        var stubClose = sandbox.stub(subsegment, 'close');
        var session = { run: function (fcn) { fcn(); } };
        var stubRun = sandbox.stub(session, 'run');

        sandbox.stub(AWSXRay, 'getNamespace').returns(session);
        query.call(connectionObj, {sql: 'sql here', timeout: 234}, function () { });

        stubBaseQuery.should.have.been.calledWith(sinon.match({ sql: 'sql here', timeout: 234 }), undefined, sinon.match.func);
        stubBaseQuery.args[0][2].call(queryObj);

        setTimeout(function () {
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

      it('should start a new automatic context when last query paramater is null', function() {
        query.call(connectionObj, 'sql here', function() {}, null);

        assert.equal(stubBaseQuery.args[0][2].name, 'autoContext');
      });
    });
  });

  describe('#capturePromiseQuery', function() {
    describe('for basic connections', function() {
      var conn, resolvedConn, mysql, queryObj, sandbox, segment, stubAddNew, stubBaseQuery, subsegment;

      before(function() {
        conn = new Promise(function(resolve, reject) {
          resolve({
            connection: {
              config: {
                user: 'mcmuls',
                host: 'database.location',
                port: '8080',
                database: 'myTestDb'
              },
              query: function() {}
            },
            query: function() {
              var self = this, args = arguments;
              return new Promise(function(resolve, reject) {
                self.connection.query.apply(self.connection, args);
                resolve();
              });
            }
          });
        });

        mysql = { createConnection: function() { return conn; } };
        mysql = captureMySQL(mysql);
      });

      beforeEach(function(done) {
        sandbox = sinon.sandbox.create();
        segment = new Segment('test');
        subsegment = segment.addNewSubsegment('testSub');

        queryObj = new TestEmitter();
        queryObj.sql = 'sql statement here';
        queryObj.values = ['hello', 'there'];

        sandbox = sinon.sandbox.create();
        sandbox.stub(AWSXRay, 'getSegment').returns(segment);
        stubAddNew = sandbox.stub(segment, 'addNewSubsegment').returns(subsegment);
        sandbox.stub(AWSXRay, 'isAutomaticMode').returns(true);

        mysql.createConnection().then(function (result) {
          resolvedConn = result;
          stubBaseQuery = sandbox.stub(resolvedConn.connection, '__query').returns(queryObj);
          done();
        });
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should create a new subsegment using database and host', function() {
        var config = resolvedConn.connection.config;
        resolvedConn.query('sql here').then(function() {
          stubAddNew.should.have.been.calledWithExactly(config.database + '@' + config.host);
        });
      });

      it('should add the sql data to the subsegment', function() {
        var stubAddSql = sandbox.stub(subsegment, 'addSqlData');
        var stubDataInit = sandbox.stub(SqlData.prototype, 'init');
        var config = resolvedConn.connection.config;

        resolvedConn.query('sql here').then(function() {
          stubDataInit.should.have.been.calledWithExactly(undefined, undefined, config.user,
            config.host + ':' + config.port + '/' + config.database, 'statement');
          stubAddSql.should.have.been.calledWithExactly(sinon.match.instanceOf(SqlData));
        });
      });

      it('should close the subsegment via the event', function() {
        var stubClose = sandbox.stub(subsegment, 'close');
        resolvedConn.query().then(function() {
          queryObj.emit('end');
          stubClose.should.always.have.been.calledWithExactly();
        });
      });

      it('should capture the error via the event', function() {
        var stubClose = sandbox.stub(subsegment, 'close');
        resolvedConn.query().then(function() {
          assert.throws(function() {
            queryObj.emit('error', err);
          });

          stubClose.should.have.been.calledWithExactly(err);
        });
      });

    });
  });

  describe('#capturePool', function(){
    it('should patch getConnection on the pool', function(){
      var pool = {
        query: function() {},
        getConnection: function() {}
      };
      var mysql = {
        createPool: function() { return pool; }
      };

      var mysqlObj = captureMySQL(mysql);
      var patched = mysqlObj.createPool();

      assert.property(patched, '__getConnection');
      assert.equal(patched.getConnection.name, 'patchedGetConnection');
    });

    describe('for basic connections', function(){
      var conn, connectionObj, pool, poolObj, mysql, query, queryObj, sandbox, segment, stubAddNew, stubBaseQuery, subsegment;

      before(function(done) {
        conn = {
          config: {
            user: 'mcmuls',
            host: 'database.location',
            port: '8080',
            database: 'myTestDb'
          },
          query: function() {}
        };
        pool = {
          query: function() {},
          getConnection: function(callback) { return callback(undefined, conn); }
        };

        mysql = { createPool: function() { return pool; } };
        mysql = captureMySQL(mysql);
        poolObj = mysql.createPool();
        poolObj.getConnection(function (err, connection) {connectionObj = connection; return done();});
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
    });
  });

  describe('#capturePromisePool', function(){
    describe('for basic connections', function(){
      var conn, connectionObj, pool, poolObj, mysql, query, queryObj, sandbox, segment, stubAddNew, stubBaseQuery, subsegment;

      before(function(done) {
        conn = {
          config: {
            user: 'mcmuls',
            host: 'database.location',
            port: '8080',
            database: 'myTestDb'
          },
          query: function() {}
        };
        pool = {
          query: function() {},
          getConnection: function() { return Promise.resolve(conn); }
        };

        mysql = { createPool: function() { return pool; } };
        mysql = captureMySQL(mysql);
        poolObj = mysql.createPool();
        poolObj.getConnection()
          .then(function(connection) {
            connectionObj = connection;
            return done();
          });
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
    });
  });

  describe('#capturePoolCluster', function(){
    it('should patch getConnection and of on the poolCluster', function(){
      var poolCluster = {
        query: function() {},
        getConnection: function() {},
        of: function() {}
      };
      var mysql = {
        createPoolCluster: function() { return poolCluster; }
      };

      var mysqlObj = captureMySQL(mysql);
      var patched = mysqlObj.createPoolCluster();

      assert.property(patched, '__getConnection');
      assert.equal(patched.getConnection.name, 'patchedGetConnection');
      assert.property(patched, '__of');
      assert.equal(patched.of.name, 'patchedOf');
    });

    it('should patch the pool returned by of', function(){
      var pool = {
        query: function() {},
        getConnection: function() {}
      };
      var poolCluster = {
        query: function() {},
        getConnection: function() {},
        of: function() {return pool;}
      };
      var mysql = {
        createPoolCluster: function() { return poolCluster; }
      };

      var mysqlObj = captureMySQL(mysql);
      var patched = mysqlObj.createPoolCluster();
      var patchedPool = patched.of();

      assert.property(patchedPool, '__getConnection');
      assert.equal(patchedPool.getConnection.name, 'patchedGetConnection');
    });

    describe('for basic connections', function(){
      var conn, connectionObj, poolCluster, poolClusterObj, mysql, query, queryObj, sandbox, segment, stubAddNew, stubBaseQuery, subsegment;

      before(function(done) {
        conn = {
          config: {
            user: 'mcmuls',
            host: 'database.location',
            port: '8080',
            database: 'myTestDb'
          },
          query: function() {}
        };
        poolCluster = {
          query: function() {},
          getConnection: function(patternOrCb, selectorOrCb, callback) {
            if (patternOrCb instanceof Function) return patternOrCb(undefined, conn);
            else if (selectorOrCb instanceof Function) return selectorOrCb(undefined, conn);
            else return callback(undefined, conn);
          }
        };

        mysql = { createPoolCluster: function() { return poolCluster; } };
        mysql = captureMySQL(mysql);
        poolClusterObj = mysql.createPoolCluster();
        poolClusterObj.getConnection(function (err, connection) {connectionObj = connection; return done();});
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
    });
  });
});
