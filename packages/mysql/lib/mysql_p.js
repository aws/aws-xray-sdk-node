/**
 * @module mysql_p
 */

var AWSXRay = require('aws-xray-sdk-core');
var SqlData = AWSXRay.database.SqlData;

var DATABASE_VERS = process.env.MYSQL_DATABASE_VERSION;
var DRIVER_VERS = process.env.MYSQL_DRIVER_VERSION;

var PREPARED = 'statement';

/**
 * Patches the Node MySQL client to automatically capture query information for the segment.
 * Connection.query and pool.query calls are automatically captured.
 * In manual mode, connection.query and pool.query require a segment or subsegment object
 * as an additional argument as the last argument for the query.
 * @param {mysql} module - The MySQL npm module.
 * @returns {mysql}
 * @see https://github.com/mysqljs/mysql
 */

module.exports = function captureMySQL(mysql) {
  if (mysql.__createConnection)
    return mysql;

  patchCreateConnection(mysql);
  patchCreatePool(mysql);

  return mysql;
};

function patchCreateConnection(mysql) {
  var baseFcn = '__createConnection';
  mysql[baseFcn] = mysql['createConnection'];

  mysql['createConnection'] = function patchedCreateConnection() {
    var connection = mysql[baseFcn].apply(connection, arguments);
    connection.__query = connection.query;
    connection.query = captureQuery;

    return connection;
  };
}

function patchCreatePool(mysql) {
  var baseFcn = '__createPool';
  mysql[baseFcn] = mysql['createPool'];

  mysql['createPool'] = function patchedCreatePool() {
    var pool = mysql[baseFcn].apply(pool, arguments);
    pool.__query = pool.query;
    pool.query = captureQuery;

    return pool;
  };
}

function resolveArguments(argsObj) {
  var args = {};

  if (argsObj && argsObj.length > 0) {
    args.sql = argsObj[0];
    args.values = typeof argsObj[1] !== 'function' ? argsObj[1] : null;
    args.callback = !args.values ? argsObj[1] : (typeof argsObj[2] === 'function' ? argsObj[2] : null);
    args.segment = (argsObj[argsObj.length-1].constructor && (argsObj[argsObj.length-1].constructor.name === 'Segment' ||
      argsObj[argsObj.length-1].constructor.name === 'Subsegment')) ? argsObj[argsObj.length-1] : null;
  }

  return args;
}

function captureQuery() {
  var args = resolveArguments(arguments);
  var parent = AWSXRay.resolveSegment(args.segment);
  var query;

  if (args.segment)
    delete arguments[arguments.length-1];

  if (!parent) {
    AWSXRay.getLogger().info('Failed to capture MySQL. Cannot resolve sub/segment.');
    return this.__query.apply(this, arguments);
  }

  var config = this.config.connectionConfig || this.config;
  var subsegment = parent.addNewSubsegment(config.database + '@' + config.host);

  if (args.callback) {
    var cb = args.callback;

    if (AWSXRay.isAutomaticMode()) {
      args.callback = function autoContext(err, data) {
        var session = AWSXRay.getNamespace();

        session.run(function() {
          AWSXRay.setSegment(subsegment);
          cb(err, data);
        });

        subsegment.close(err);
      };
    } else {
      args.callback = function wrappedCallback(err, data) {
        cb(err, data);
        subsegment.close(err);
      };
    }
  }

  query = this.__query.call(this, args.sql, args.values, args.callback);

  if (!args.callback) {
    query.on('end', function() {
      subsegment.close();
    });

    var errorCapturer = function (err) {
      subsegment.close(err);

      if (this._events && this._events.error && this._events.error.length === 1) {
        this.removeListener('error', errorCapturer);
        this.emit('error', err);
      }
    };

    query.on('error', errorCapturer);
  }

  subsegment.addSqlData(createSqlData(config, query));
  subsegment.namespace = 'remote';

  return query;
}

function createSqlData(config, query) {
  var queryType = query.values ? PREPARED : null;

  var data = new SqlData(DATABASE_VERS, DRIVER_VERS, config.user,
    config.host + ':' + config.port + '/' + config.database,
    queryType);

  return data;
}
