var reportToFile = require('./file');
var reportToDatabase = require('./database');

/**
 * Report time-series data to a file and possibly also to a database determined
 * from the environment
 * @param {object} data
 * @returns {Promise}
 */
module.exports = function(data) {
  var promise = reportToFile(data);

  if (process.env.RAPTOR_DATABASE) {
    promise = promise
      .then(function() {
        return reportToDatabase(data);
      });
  }

  return promise;
};
