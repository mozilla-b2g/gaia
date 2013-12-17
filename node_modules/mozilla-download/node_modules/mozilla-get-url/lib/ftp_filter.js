var FTP = require('jsftp'),
    urls = require('./urls'),
    debug = require('debug')('mozilla-get-url:ftp_filter')
    pathUtils = require('path');

/**
Internal wrapper around jsftp
*/
function ftpClient() {
  return new FTP({
    host: urls.FTP_HOST
  });
}

function FTPFilter(options) {
  this.ftp = ftpClient();
  this.options = options;
}

function appendFileToPath(path, file) {
  return pathUtils.join(path, String(file));
}

FTPFilter.prototype = {
  locate: function(path, filter, callback) {
    debug('ftp', 'ls', path);
    this.ftp.ls(path, function(err, list) {
      if (process.env.DEBUG) {
        debug('ftp', 'files', list.map(function(item) { return item.name }));
      }

      if (err) {
        return callback(err);
      }

      // apply the filter
      var pick = filter(this.options, list);
      if (!pick) {
        return callback(
          new Error('no suitable build found in path: ' + path)
        );
      }

      if (!Array.isArray(pick)) {
        pick = [pick];
      }

      pick = pick.map(appendFileToPath.bind(null, path));
     
      function next() {
        var nextPath;
        if ((nextPath = pick.shift())) {
          callback(null, nextPath, next);
        } else {
          var err = new Error('could not find a suitable binary directory in ' + path);
          callback(err);
        }
      }

      next();
    }.bind(this));
  },

  close: function() {
    this.ftp.raw.quit();
  }
};

module.exports = FTPFilter;
