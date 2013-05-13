var FileWatcher = require(__dirname + '/../watchr'),
    fsPath = require('path');

/**
 * REQUIRES: broadcast, suite, queue-tests
 *
 * Watcher module for websocket server
 * will emit an event with the test file that changed.
 *
 * @param {Suite} suite object from node/suite.
 */
function Watcher() {}

Watcher.prototype = {

  basePath: '/',
  eventName: 'queue tests',

  enhance: function enhance(server) {
    this.suite = server.suite;
    this.start(this._onFileChange.bind(this, server));
  },

  start: function start(callback) {
    this.suite.findFiles(function(err, files) {
      if (err) {
        throw err;
      }
      var watcher = new FileWatcher(files);
      watcher.start(callback);
    });
  },

  _onFileChange: function _onFileChange(server, file) {
    server.emit(this.eventName, {files: [file]});
  }

};

module.exports = exports = Watcher;
