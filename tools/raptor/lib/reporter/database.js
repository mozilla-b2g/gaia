var Promise = require('promise');
var influx = require('influx');
var debug = require('debug')('raptor:reporter');

/**
 * InfluxDB client. This connection is HTTP-based, so it is not persistent.
 */
var client = influx({
  host: process.env.RAPTOR_HOST || 'localhost',
  port: process.env.RAPTOR_PORT || 8086,
  username: process.env.RAPTOR_USERNAME || 'root',
  password: process.env.RAPTOR_PASSWORD || 'root',
  database: process.env.RAPTOR_DATABASE || 'raptor'
});

/**
 * Write time-series data to an InfluxDB database
 * @param {object} data
 * @returns {Promise}
 */
module.exports = function(data) {
  return new Promise(function(resolve, reject) {
    debug('Writing report results to database');
    client.writeSeries(data, function(err) {
      if (err) {
        debug('Error writing report results to database: %j', err);
        return reject(err);
      }

      resolve();
    })
  });
};
