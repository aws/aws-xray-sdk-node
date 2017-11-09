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

  pg.Client.prototype.query = function captureQuery(sql, values, callback, segment) {
    var parent = AWSXRay.resolveSegment(segment);
    delete arguments[3];

    if (!parent) {
      AWSXRay.getLogger().info('Failed to capture Postgres. Cannot resolve sub/segment.');
      return this.__query.apply(this, arguments);
    }

    var subsegment = parent.addNewSubsegment(this.database + '@' + this.host);
    subsegment.namespace = 'remote';

    var query = this.__query.apply(this, arguments);

    subsegment.addSqlData(createSqlData(this.connectionParameters, query));

    if (typeof query.callback === 'function') {
      var cb = query.callback;

      if (AWSXRay.isAutomaticMode()) {
        query.callback = function autoContext(err, data) {
          var session = AWSXRay.getNamespace();

          session.run(function() {
            AWSXRay.setSegment(subsegment);
            cb(err, data);
          });

          subsegment.close(err);
        };
      } else {
        query.callback = function(err, data) {
          cb(err, data, subsegment);
          subsegment.close(err);
        };
      }
    } else {
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

    return query;
  };

  return pg;
};

function createSqlData(connParams, query) {
  var queryType = query.name ? PREPARED : undefined;

  var data = new SqlData(DATABASE_VERS, DRIVER_VERS, connParams.user,
    connParams.host + ':' + connParams.port + '/' + connParams.database,
    queryType);

  return data;
}
