var mozget = require('mozilla-get-url'),
    tmp = require('tmp'),
    fs = require('fs'),
    http = require('http'),
    debug = require('debug')('mozilla-runner:download'),
    opts = require('./options'),
    extract = require('./extract');

var DEFAULT_VERSION = 'nightly';

/**
 * Downloads a mozilla product to a given path.
 *
 *    runner.download('firefox', path, function(err) {
 *      // do amazing things!
 *    });
 *
 * Options (these are passed to mozilla-get-url):
 *    - product: like firefox / b2g
 *    - os: to download for (see firefox-get)
 *    - version: or channel (like 18 or 'nightly')
 *    - strict: send an error if given path exists.
 *
 * @param {String} path to download file to.
 * @param {Object} [options] optional set of configuration options.
 * @param {Function} callback [err, path];
 */
function download(path, options, callback) {
  var product = options.product || 'firefox';
  var os = options.os;
  debug('download', options);

  function saveToTemp(err, url) {
    if (err) return callback(err);
    console.log('Will download at url', url);

    tmp.file({ prefix: 'mozilla-download-' + os }, function(err, tmpPath) {
      if (err) return callback(err);
      debug('open temp stream', tmpPath);
      var stream = fs.createWriteStream(tmpPath);
      http.get(url, function(res) {
        debug('opened http connection downloading...', path);
        res.pipe(stream);
        var i = 0;
        stream.on('close', function() {
          debug('done downloading extract', url, tmpPath, path);
          extract(product, url, tmpPath, path, callback);
        });
      });
    });
  }

  mozget(options, saveToTemp);
}

function checkDownload(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  options = opts(options || {});

  var strictErrors = options.strict;

  // don't clobber an existing path
  fs.exists(path, function(itDoes) {

    // bail immediately if path is filled
    if (itDoes) {
      // unless strict is on we simply return the given path assuming it works.
      if (!strictErrors) return callback(null, path);

      // in other cases the caller might want an error.
      return callback(
        new Error('cannot clobber existing path with download: "' + path + '"')
      );
    }

    // if path does not exist continue with normal download process.
    download(path, options, callback);
  });
}

module.exports = checkDownload;
