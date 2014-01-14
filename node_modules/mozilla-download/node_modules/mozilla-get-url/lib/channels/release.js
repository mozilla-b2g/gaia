var fsPath = require('path'),
    urls = require('../urls'),
    handleOpts = require('../options'),
    debug = require('debug')('mozilla-get-url:channel:release');
    FTPFilter = require('../ftp_filter'),
    xulrunner = require('../productions/xulrunner');

function filter(options, list) {
  if (!list.length) return null;

  // XULRunner need special filter.
  if ('xulrunner' === options.product)
    return xulrunner.filter(options, list);
  return list[0].name;
}

/**
Channel handler for the firefox "release" channel this is not used
for b2g as we don't have a formal versioned release channel there

@param {Object} options see lib/options.js.
@param {Function} [Error, String url].
*/
function locate(options, callback) {
  // special case beta (sorry world!)
  if (options.branch === 'beta') {
    // we copy in handleOpts so its safe to do this.
    options.branch = 'latest-beta';
  }

  // TODO: There should be a formal dispatcher to patch it by productions.
  // Some special, not matching path need some patches.
  //
  // construct a base url
  var path = "";
  if ('xulrunner' === options.product) {
    path = xulrunner.path(options, 'releases');
  } else {
    path = urls.ftpPath(
      options.product,
      'releases',
      options.branch,
      options.os,
      options.language,
      '/'
    );
  }

  var ftpFilter = new FTPFilter(options);

  debug('searching for release', path);
  ftpFilter.locate(path, filter, function(err, path) {
    ftpFilter.close();
    if (err) return callback(err);
    callback(null, urls.httpUrl(path));
  });
}

module.exports = locate;
