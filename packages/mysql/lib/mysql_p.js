/**
 * @module mysql_p
 */

var AWSXRay = require('aws-xray-sdk-core');
var events = require('events');
var SqlData = AWSXRay.database.SqlData;

var DATABASE_VERS = process.env.MYSQL_DATABASE_VERSION;
var DRIVER_VERS = process.env.MYSQL_DRIVER_VERSION;

var PREPARED = 'statement';

/**
 * Patches the Node MySQL client to automatically capture query information for the segment.
 * Connection.query, connection.execute, and pool.query calls are automatically captured.
 * In manual mode, these functions require a segment or subsegment object as an additional,
 * last argument.
 * @param {mysql} module - The MySQL npm module.
 * @returns {mysql}
 * @see https://github.com/mysqljs/mysql
 */

module.exports = function captureMySQL(mysql) {
  if (mysql.__createConnection) {
    return mysql;
  }

  patchCreateConnection(mysql);
  patchCreatePool(mysql);
  patchCreatePoolCluster(mysql);

  return mysql;
};

function isPromise(maybePromise) {
  if (maybePromise != null && maybePromise.then instanceof Function) {
    // mysql2 has a `Query` class with a `then` method which always throws an error when called.
    // We want to avoid calling this, so we need to check for more than just the presence of a `then` method.
    // See https://github.com/sidorares/node-mysql2/blob/dbb344e89a1cc8bb457b24e67b07cdb3013fe844/lib/commands/query.js#L38-L44
    // Since it's highly unlikely that any Promise implementation would name their class `Query`,
    // we can safely use this to determine whether or not this is actually a Promise.
    const constructorName = maybePromise.constructor != null ? maybePromise.constructor.name : undefined;
    return constructorName !== 'Query';
  }
  return false;
}

function patchCreateConnection(mysql) {
  var baseFcn = '__createConnection';
  mysql[baseFcn] = mysql['createConnection'];

  mysql['createConnection'] = function patchedCreateConnection() {
    var connection = mysql[baseFcn].apply(connection, arguments);
    if (isPromise(connection)) {
      connection = connection.then((result) => {
        patchObject(result.connection);
        return result;
      });
    } else if (connection.query instanceof Function) {
      patchObject(connection);
    }
    return connection;
  };
}

function patchCreatePool(mysql) {
  var baseFcn = '__createPool';
  mysql[baseFcn] = mysql['createPool'];

  mysql['createPool'] = function patchedCreatePool() {
    var pool = mysql[baseFcn].apply(pool, arguments);
    if (isPromise(pool)) {
      pool = pool.then((result) => {
        patchObject(result.pool);
        return result;
      });
    } else if (pool.query instanceof Function) {
      patchObject(pool);
    }
    return pool;
  };
}

function patchCreatePoolCluster(mysql) {
  var baseFcn = '__createPoolCluster';
  mysql[baseFcn] = mysql['createPoolCluster'];

  mysql['createPoolCluster'] = function patchedCreatePoolCluster() {
    var poolCluster = mysql[baseFcn].apply(poolCluster, arguments);
    if (poolCluster.query instanceof Function) {
      patchObject(poolCluster);
    }
    return poolCluster;
  };
}

function patchOf(poolCluster) {
  var baseFcn = '__of';
  poolCluster[baseFcn] = poolCluster['of'];

  poolCluster['of'] = function patchedOf() {
    var args = arguments;

    var resultPool = poolCluster[baseFcn].apply(poolCluster, args);
    return patchObject(resultPool);
  };
}

function patchGetConnection(pool) {
  var baseFcn = '__getConnection';
  pool[baseFcn] = pool['getConnection'];

  pool['getConnection'] = function patchedGetConnection() {
    var args = arguments;
    var callback = args[args.length-1];

    if (callback instanceof Function) {
      args[args.length-1] = (err, connection) => {
        if (connection) {
          patchObject(connection);
        }
        return callback(err, connection);
      };
    }

    var result = pool[baseFcn].apply(pool, args);
    if (isPromise(result)) {
      return result.then(patchObject);
    } else {
      return result;
    }
  };
}

function patchObject(connection) {
  if (connection.query instanceof Function && !connection.__query) {
    connection.__query = connection.query;
    connection.query = captureOperation('query');
  }

  if (connection.execute instanceof Function && !connection.__execute) {
    connection.__execute = connection.execute;
    connection.execute = captureOperation('execute');
  }

  if (connection.getConnection instanceof Function && !connection.__getConnection) {
    patchGetConnection(connection);
  }

  // Patches the of function on a mysql PoolCluster which returns a pool
  if (connection.of instanceof Function && !connection.__of) {
    patchOf(connection);
  }
  return connection;
}

function resolveArguments(argsObj) {
  var args = {};

  if (argsObj && argsObj.length > 0) {
    if (argsObj[0] instanceof Object) {
      args.sql = argsObj[0];

      // Patch for mysql2
      if (argsObj[0].values) {
        args.values = argsObj[0].values; // mysql implementation
      } else if (typeof argsObj[2] === 'function') {
        args.values = typeof argsObj[1] !== 'function' ? argsObj[1] : null; // mysql2 implementation
      }
      args.callback = typeof argsObj[1] === 'function'
        ? argsObj[1]
        : (
          typeof argsObj[2] === 'function'
            ? argsObj[2]
            : undefined
        );
      if (!argsObj[1] && argsObj[0].on instanceof Function) {
        args.sql = argsObj[0];
      }
    } else {
      args.sql = argsObj[0];
      args.values = typeof argsObj[1] !== 'function' ? argsObj[1] : null;
      args.callback = typeof argsObj[1] === 'function' ? argsObj[1] : (typeof argsObj[2] === 'function' ? argsObj[2] : undefined);
    }

    args.segment = (argsObj[argsObj.length-1] != null && argsObj[argsObj.length-1].constructor && (argsObj[argsObj.length-1].constructor.name === 'Segment' ||
      argsObj[argsObj.length-1].constructor.name === 'Subsegment')) ? argsObj[argsObj.length-1] : null;
  }

  return args;
}

function captureOperation(name) {
  return function() {
    var args = resolveArguments(arguments);
    var parent = AWSXRay.resolveSegment(args.segment);
    var command;
    var originalOperation = this['__'+name];

    if (args.segment) {
      delete arguments[arguments.length-1];
    }

    if (!parent) {
      AWSXRay.getLogger().info('Failed to capture MySQL. Cannot resolve sub/segment.');
      return originalOperation.apply(this, arguments);
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

    command = originalOperation.call(this, args.sql, args.values, args.callback);

    if (!args.callback) {
      var errorCapturer = function (err) {
        subsegment.close(err);
      };

      if (isPromise(command)) {
        command.then(() => {
          subsegment.close();
        }).catch (errorCapturer);
      } else {
        command.on('end', function() {
          subsegment.close();
        });

        command.on(events.errorMonitor || 'error', errorCapturer);
      }
    }

    subsegment.addSqlData(createSqlData(config, args.values, args.sql));
    subsegment.namespace = 'remote';

    return command;
  };
}

/**
 * Generate a SQL data object.  Note that this implementation differs from
 * that in postgres_p.js because the posgres client structures commands
 * and prepared statements differently than mysql/mysql2.
 *
 * @param {object} config
 * @param {any} values
 * @param {string} sql
 * @returns SQL data object
 */
function createSqlData(config, values, sql) {
  var commandType = values ? PREPARED : null;
  var data = new SqlData(DATABASE_VERS, DRIVER_VERS, config.user,
    config.host + ':' + config.port + '/' + config.database,
    commandType);

  if (process.env.AWS_XRAY_COLLECT_SQL_QUERIES && sql) {
    data.sanitized_query = sql;
  }

  return data;
}
