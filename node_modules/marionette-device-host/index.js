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
  if (!this.options.host)
    this.options.host = 'localhost';
  if (!this.options.port)
    this.options.port = DEFAULT_PORT;
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

    this.port = options.port;
    var port = this.port;

    var adb = spawn('adb', ['forward', 'tcp:' + this.port,
			    'tcp:' + DEFAULT_PORT]);
    adb.on('close', function() {
      debug('Set adb forward to ' + port);
      callback();
    });
    adb.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    adb.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
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
      console.log('stdout: ' + data);
    });
    adb.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
  }
};

module.exports = Host;
