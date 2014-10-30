var urls = require('../urls'),
    buildFilter = require('../tinderbox_build_filter'),
    binaryFilter = require('../prerelease_filter'),
    debug = require('debug')('mozilla-get-url:channel:try'),
    FTPFilter = require('../ftp_filter');

/**
@param {Object} options for release (see lib/options)
@param {Function} [Error, String url].
*/
function locate(options, callback) {
  // construct a base url
  var path = urls.ftpPath(
    options.product,
    'try-builds',
    options.branch,
    '/'
  );

  debug('fetching branch', path);

  // we need to override the options "branch" so its always "try"
  var filterOpts = {};
  for (var key in options) filterOpts[key] = options[key];
  filterOpts.branch = 'try';

  var ftpFilter = new FTPFilter(filterOpts);

  ftpFilter.locate(path, buildFilter, function(err, path) {
    if (err) {
      ftpFilter.close();
      return callback(err);
    }

    debug('located build', path);

    ftpFilter.locate(path, binaryFilter, function(err, path) {
      // always close ftp connection
      ftpFilter.close();
      if (err) return callback(err);

      callback(null, urls.httpUrl(path));
    });
  });
}

module.exports = locate;
