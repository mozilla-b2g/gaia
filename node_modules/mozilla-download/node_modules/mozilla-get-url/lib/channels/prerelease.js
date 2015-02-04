var fsPath = require('path'),
    urls = require('../urls'),
    handleOpts = require('../options'),
    filter = require('../prerelease_filter'),
    debug = require('debug')('mozilla-get-url:channel:prerelease'),
    FTPFilter = require('../ftp_filter');

var BRANCH_MAPPING = {
  aurora: 'nightly/latest-mozilla-aurora',
  'mozilla-central': 'nightly/latest-mozilla-central',
  // alias for mozilla-central
  nightly: 'nightly/latest-mozilla-central'
};

/**
Channel handler for the firefox "release" branch this is not used
for b2g as we don't have a formal versioned release channel there

@param {Object} options for release (see lib/options)
@param {Function} [Error, String url].
*/
function locate(options, callback) {
  // we have some special cases for common names
  // for firefox. We also allow the direct path to the folder for uncommon cases
  // like the weird stuff in b2g.

  var branch = BRANCH_MAPPING[options.branch] || options.branch;

  // default branch is nightly
  if (!branch) branch = BRANCH_MAPPING.nightly;

  // construct a base url
  var path = urls.ftpPath(
    options.product,
    branch,
    '/'
  );

  debug('fetching branch', path);

  // verify it actually exists and return path
  var ftpFilter = new FTPFilter(options);

  ftpFilter.locate(path, filter, function(err, path) {
    ftpFilter.close();
    if (err) {
      return callback(err);
    }
    callback(null, urls.httpUrl(path));
  });
}

module.exports = locate;

