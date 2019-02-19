/**
 * @module postgres_p
 */

var AWSXRay = require('aws-xray-sdk-core');
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
  if (pg.Client.prototype.__query)
    return pg;

  pg.Client.prototype.__query = pg.Client.prototype.query;
  pg.Client.prototype.query = captureQuery;
  return pg;
};

function resolveArguments(argsObj) {
  var args = {};

  if (argsObj && argsObj.length > 0) {
    if (argsObj[0] instanceof Object) {
      args.sql = argsObj[0].text;
      args.values = argsObj[0].values;
      args.callback = argsObj[1] || argsObj[0].callback;
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

function captureQuery() {
  var args = resolveArguments(arguments);
  var parent = AWSXRay.resolveSegment(args.segment);

  if (!parent) {
    AWSXRay.getLogger().info('Failed to capture Postgres. Cannot resolve sub/segment.');
    return this.__query.apply(this, arguments);
  }

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

  var result = this.__query.call(this, args.sql, args.values, args.callback);

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

        if (this._events && this._events.error && this._events.error.length === 1) {
          this.removeListener('error', errorCapturer);
          this.emit('error', err);
        }
      };

      query.on('error', errorCapturer);
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

  return data;
}
