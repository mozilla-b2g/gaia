var path = require('path');
var fs = require('fs');
var Promise = require('promise');
var debug = require('debug')('raptor:reporter');

var destination = path.join(process.cwd(),
  process.env.RAPTOR_LOG || 'raptor.log');
var stream;

/**
 * Write time-series data to a logfile
 * @param {object} data
 * @returns {Promise}
 */
module.exports = function(data) {
  return new Promise(function(resolve, reject) {
    // Use a file stream as we may be writing to this file many times over the
    // course of a suite
    if (!stream) {
      stream = fs.createWriteStream(destination, { flags: 'a' });
    }

    debug('Writing report results to file');

    stream.write(JSON.stringify(data) + '\n', function(err) {
      if (err) {
        debug('Error writing report results to file: %j', err);
        return reject(err);
      }

      resolve();
    });
  });
};
