/**
 * @module postgres_p
 */

var AWSXRay = require('aws-xray-sdk-core');
var events = require('events');
var SqlData = AWSXRay.database.SqlData;

var DATABASE_VERS = process.env.POSTGRES_DATABASE_VERSION;
var DRIVER_VERS = process.env.POSTGRES_DRIVER_VERSION;

var PREPARED = 'statement';

/**
 * Patches the Node PostreSQL client to automatically capture query information for the segment.
 * Client.query calls are automatically captured.
 * In manual mode, client.query requires a sub/segment object
 * as an additional argument as the last argument for the query.
 * @function
 * @param {pg} module - The PostgreSQL npm module.
 * @returns {pg}
 * @see https://github.com/brianc/node-postgres
 */

module.exports = function capturePostgres(pg) {
  if (pg.Client.prototype.__query) {
    return pg;
  }

  pg.Client.prototype.__query = pg.Client.prototype.query;
  pg.Client.prototype.query = captureQuery;
  return pg;
};

// From pg/lib/utils.js
function pgNormalizeQueryConfig(config, values, callback) {
  // can take in strings or config objects
  var argsObj = typeof config === 'string' ? { text: config } : config;
  if (values) {
    if (typeof values === 'function') {
      argsObj.callback = values;
    } else {
      argsObj.values = values;
    }
  }
  if (callback) {
    argsObj.callback = callback;
  }
  return argsObj;
}

function captureQuery() {
  var lastArg = arguments[arguments.length-1];
  var parent = AWSXRay.resolveSegment(
    (lastArg != null && lastArg.constructor &&
      (lastArg.constructor.name === 'Segment' || lastArg.constructor.name === 'Subsegment'))
      ? lastArg
      : null
  );

  if (!parent) {
    AWSXRay.getLogger().info('Failed to capture Postgres. Cannot resolve sub/segment.');
    return this.__query.apply(this, arguments);
  }


  var args = pgNormalizeQueryConfig.apply(this, arguments) || {};

  var subsegment = parent.addNewSubsegment(this.database + '@' + this.host);
  subsegment.namespace = 'remote';

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
      args.callback = function(err, data) {
        cb(err, data, subsegment);
        subsegment.close(err);
      };
    }
  }

  var result = this.__query.call(this, args);

  if (this._queryable && !this._ending) {
    var query;
    // To get the actual query object, we have to extract it from the
    // owning connection object.  The query will either be the last one in
    // the queue or it will be the active query.
    if (this.queryQueue.length === 0) {
      query = this.activeQuery;
    } else {
      query = this.queryQueue[this.queryQueue.length-1];
    }

    if (!args.callback && query.on instanceof Function) {
      query.on('end', function() {
        subsegment.close();
      });

      var errorCapturer = function (err) {
        subsegment.close(err);
      };

      query.on(events.errorMonitor || 'error', errorCapturer);
    }

    subsegment.addSqlData(createSqlData(this.connectionParameters, query));
  }

  return result;
}

function createSqlData(connParams, query) {
  var queryType = query.name ? PREPARED : undefined;

  var data = new SqlData(DATABASE_VERS, DRIVER_VERS, connParams.user,
    connParams.host + ':' + connParams.port + '/' + connParams.database,
    queryType);
  if (process.env.AWS_XRAY_COLLECT_SQL_QUERIES) {
    data.sanitized_query = query.text;
  }

  return data;
}
