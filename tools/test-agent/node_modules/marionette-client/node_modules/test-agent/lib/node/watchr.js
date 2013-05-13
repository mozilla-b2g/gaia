/* there are other watchr's but they don't do the trick */

var fs = require('fs');

/**
 * Accepts an array of files to watch
 *
 * @param {Array} files
 */
function Watchr(files) {
  this.files = files;
  this.watchers = {};
}

Watchr.prototype = {

  start: function start(callback) {
    var self = this;


    this.files.forEach(function(file) {
      var result = fs.watchFile(file, {interval: 100}, function(curr, prev) {
        if (curr.mtime > prev.mtime) {
          callback(file);
        }
      });

      self.watchers[file] = result;
    });
  },

  stop: function stop() {
    var file;

    for (file in this.watchers) {
      this.watchers[file].stop();
      delete this.watchers[file];
    }
  }

};


module.exports = exports = Watchr;
