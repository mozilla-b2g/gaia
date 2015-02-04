var fsPath = require('path'),
    fs = require('fs'),
    spawn = require('child_process').spawn,
    debug = require('debug')('marionette-device-host');

const DEFAULT_PORT = 2828;

/**
 * Host interface for marionette-js-runner.
 *
 * TODO: I think this API is much more sane then the original
 *       |spawn| interface but we also need to do some refactoring
 *       in the mozilla-profile-builder project to improve the apis.
 *
 * @param {Object} [options] for host see spawn for now.
 */
function Host(options) {
  this.options = options || {};
  if (!this.options.host) {
    this.options.host = 'localhost';
  }
  if (!this.options.port) {
    this.options.port = DEFAULT_PORT;
  }
  if ('RESTART_B2G' in process.env) {
    this.options.restart = process.env.RESTART_B2G === '0' ? false : true;
  }
  if (this.options.restart === undefined
      || this.options.restart === null) {
    this.options.restart = true;
  }
}

/**
 * Immutable metadata describing this host.
 *
 * @type {Object}
 */
Host.metadata = Object.freeze({
  host: 'device'
});

Host.prototype = {

  port: DEFAULT_PORT,

  /**
   * Perform adb forward.
   *
   * @param {String} profile path.
   * @param {Object} [options] settings provided by caller.
   * @param {Function} callback [Error err].
   */
  start: function(profile, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
    options = options || {};

    debug('start');
    if(options.port == 0 || options.port === undefined) {
      debug('port was not set. Using default.');
      options.port = this.port;
    }
    // restart is not overridden here.

    this.port = options.port;
    var port = this.port;

    var adb = spawn('adb', ['forward', 'tcp:' + this.port,
			    'tcp:' + DEFAULT_PORT]);
    adb.on('close', function() {
      debug('Set adb forward to ' + port);
      if (!this.options.restart) {
        debug('not restarting');
        callback();
        return;
      }
      debug('restarting b2g');
      var adbStart = spawn('adb', ['shell', 'stop', 'b2g']);
      adbStart.on('close', function() {

        var adbStop = spawn('adb', ['shell', 'start', 'b2g']);
        adbStop.on('close', function() {
          // Note: you need to wait for marionette to be ready.
          // The marionette client should do that for you.
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1033402
          // Callback still needs to be called Asynchronously
          setTimeout(callback, 0);
        });
      });
    }.bind(this));
    adb.stdout.on('data', function (data) {
      console.error('(start) stdout: ' + data);
    });
    adb.stderr.on('data', function (data) {
      console.error('(start) stderr: ' + data);
    });
  },

  /**
   * Stop the adb forward.
   *
   * @param {Function} callback [Error err].
   */
  stop: function(callback) {
    debug('stop');

    var port = this.port;
    var adb = spawn('adb', ['forward', '--remove', 'tcp:' + this.port]);
    adb.on('close', function() {
      debug('Removed the forward to port ' + port);
      callback();
    });
    adb.stdout.on('data', function (data) {
      console.error('(stop) stdout: ' + data);
    });
    adb.stderr.on('data', function (data) {
      console.error('(stop) stderr: ' + data);
    });
  }
};

module.exports = Host;
