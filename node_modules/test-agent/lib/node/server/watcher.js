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
  MAX_BATCH_LENGTH: 5,
  _currentBatch: [],
  _batchTimeout: null,

  enhance: function enhance(server) {
    this.server = server;
    this.start(this._onFileChange.bind(this));
  },

  start: function start(callback) {
    this.server.suite.findFiles(function(err, files) {
      if (err) {
        throw err;
      }
      var watcher = new FileWatcher(files);
      watcher.start(callback);
    });
  },

  _onFileChange: function _onFileChange(file) {
    // we try to batch the file changes in one request
    if (this._currentBatch.indexOf(file) !== -1) {
      return;
    }

    this._currentBatch.push(file);
    clearTimeout(this._batchTimeout);
    this._batchTimeout = setTimeout(this._sendBatchRequest.bind(this), 1000);
  },

  _sendBatchRequest: function _sendBatchRequest() {
    // trying to prevent running loads of tests when changing branches
    if (this._currentBatch.length <= this.MAX_BATCH_LENGTH) {
      this.server.emit(this.eventName, {files: this._currentBatch});
    } else {
      console.warn('Too many files changed at once (' +
                   this._currentBatch.length,
                   'changed files), so skipping this batch.');
    }

    this._currentBatch = [];
    this._batchTimeout = null;
  }
};

module.exports = exports = Watcher;
