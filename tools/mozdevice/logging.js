var util = require('util');
var Promise = require('promise');
var spawn = require('child_process').spawn;
var logcat = require('adbkit-logcat');
var Command = require('./command');
var debug = require('debug')('mozdevice:logging');

var ADB_HOST = process.env.ADB_HOST;
var ADB_PORT = process.env.ADB_PORT;

// Cache the connection to logcat so we can re-use for additional MozDevices
var currentProcess;
var currentStream;

/**
 * API for interacting with a device's logging
 * @param {Device} device
 * @constructor
 */
var Logging = function(device) {
  this.serial = device.serial;
};

/**
 * Execute a command against `adb shell` contextual to the device serial
 * @param command
 * @returns {Promise}
 */
Logging.prototype.adbShell = function(command) {
  return new Command()
    .env('ANDROID_SERIAL', this.serial)
    .adbShell(command)
    .exec();
};

/**
 * Write a message to the ADB log
 * @param {string} priority log command priority, e.g. v, d, i, w, e
 * @param {string} [tag] log command process tag, e.g. GeckoConsole, Homescreen
 * @param {string} message message to write to the ADB log
 * @returns {Promise}
 */
Logging.prototype.write = function(priority, tag, message) {
  if (!message) {
    message = tag;
    tag = 'GeckoConsole';
  }

  var command = util.format('log -p %s -t %s "%s"', priority, tag, message);
  return this.adbShell(command);
};

/**
 * Write a verbose message to the ADB log
 * @param {string} [tag] log command process tag, e.g. GeckoConsole, Homescreen
 * @param {string} message message to write to the ADB log
 * @returns {Promise}
 */
Logging.prototype.verbose = function(tag, message) {
  return this.write('v', tag, message);
};

/**
 * Write a debug message to the ADB log
 * @param {string} [tag] log command process tag, e.g. GeckoConsole, Homescreen
 * @param {string} message message to write to the ADB log
 * @returns {Promise}
 */
Logging.prototype.debug = function(tag, message) {
  return this.write('d', tag, message);
};

/**
 * Write an info message to the ADB log
 * @param {string} [tag] log command process tag, e.g. GeckoConsole, Homescreen
 * @param {string} message message to write to the ADB log
 * @returns {Promise}
 */
Logging.prototype.info = function(tag, message) {
  return this.write('i', tag, message);
};

/**
 * Write a warning message to the ADB log
 * @param {string} [tag] log command process tag, e.g. GeckoConsole, Homescreen
 * @param {string} message message to write to the ADB log
 * @returns {Promise}
 */
Logging.prototype.warning = function(tag, message) {
  return this.write('w', tag, message);
};

/**
 * Write an error message to the ADB log
 * @param {string} [tag] log command process tag, e.g. GeckoConsole, Homescreen
 * @param {string} message message to write to the ADB log
 * @returns {Promise}
 */
Logging.prototype.error = function(tag, message) {
  return this.write('e', tag, message);
};

/**
 * Clear the ADB log
 * @returns {Promise}
 */
Logging.prototype.clear = function() {
  debug('Clearing');
  return this.adbShell('logcat -c');
};

/**
 * Write a User Timing performance entry mark to the ADB log
 * @param {string} name performance mark name
 * @param {number} time Unix epoch of when the performance mark occurred
 * @returns {Promise}
 */
Logging.prototype.mark = function(name, time) {
  var mark = util.format(
    'Performance Entry: system.gaiamobile.org|mark|%s|0|0|%s', name, time);
  return this.info('PerformanceTiming', mark);
};

/**
 * Write the memory information to the log for a given process name belonging to
 * an application
 * @param {string} processName process name for the app e.g. Communications
 * @param {string} application app name or entry point e.g. Homescreen, Dialer
 * @returns {Promise}
 */
Logging.prototype.memory = function(processName, application) {
  var logging = this;

  return new Command()
    .env('ANDROID_SERIAL', this.serial)
    .adbShell('b2g-info')
    .pipe('grep "' + processName.substr(0, 13) + '"')
    .exec()
    .then(function(output) {
      var parts = output.split(/\s+/g);

      logging.info('PerformanceMemory', application + '|uss|' + parts[6]);
      logging.info('PerformanceMemory', application + '|pss|' + parts[7]);
      logging.info('PerformanceMemory', application + '|rss|' + parts[8]);
    });
};

/**
 * Spawn a connection to ADB logcat and set a read-stream for entries
 */
Logging.prototype.start = function() {
  if (currentProcess) {
    this.stream = currentStream;
    return;
  }

  var args = [];
  var serial = this.serial;
  var env = process.env;

  env.ANDROID_SERIAL = serial;

  if (ADB_HOST) {
    args.push('-H');
    args.push(ADB_HOST);
  }

  if (ADB_PORT) {
    args.push('-P');
    args.push(ADB_PORT);
  }

  args.push('logcat');
  args.push('-B');

  currentProcess = spawn('adb', args, {
    env: env
  });

  this.stream = currentStream = logcat.readStream(currentProcess.stdout);
};

/**
 * Stop and start the connection to ADB logcat
 */
Logging.prototype.restart = function() {
  this.stop();
  this.start();
};

/**
 * Stop the connection to ADB logcat
 */
Logging.prototype.stop = function() {
  if (currentProcess) {
    debug('Stopping logging process');
    currentProcess.kill('SIGINT');
    currentProcess = null;
    currentStream = null;
  }
};

module.exports = Logging;
