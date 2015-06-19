var Phase = require('./phase');
var Dispatcher = require('../dispatcher');
var Promise = require('promise');
var util = require('util');
var performanceParser = require('../parsers/performance');
var debug = require('debug')('raptor:reboot');
var noop = function() {};

var VERTICAL_CONTEXT = 'verticalhome.gaiamobile.org';
var SYSTEM_CONTEXT = 'system.gaiamobile.org';

/**
 * Create a suite runner which achieves a ready state when the device has been
 * rebooted
 * @param {{
 *   runs: Number,
 *   timeout: Number,
 *   retries: Number
 * }} options
 * @constructor
 */
var Reboot = function(options) {
  // The connection to the dispatcher is ADB-based, so rebooting the device will
  // kill the ADB stream. Prevent the base runner from instantiating so we can
  // control the dispatcher lifecycle
  options.preventDispatching = true;

  Phase.call(this, options);

  this.title = 'Reboot';
  this.start();
};

util.inherits(Reboot, Phase);

/**
 * Manually instantiate a Dispatcher and listen for performance entries
 */
Reboot.prototype.setup = function() {
  this.device.log.restart();
  this.dispatcher = new Dispatcher(this.device);
  this.registerParser(performanceParser);
  this.capture('performanceentry');
};

/**
 * Perform a device reboot
 * @returns {Promise}
 */
Reboot.prototype.reboot = function() {
  var runner = this;

  return this.getDevice()
    .then(function() {
      return runner.device.log.clear();
    })
    .then(function() {
      return runner.device.util.reboot();
    })
    .then(function(time) {
      return runner.device.log.mark('deviceReboot', time);
    });
};

/**
 * Stand up a device reboot for each individual test run. Will denote the run
 * has completed its work when the System marks the end of the logo screen.
 * @returns {Promise}
 */
Reboot.prototype.testRun = function() {
  var runner = this;
  var homescreenFullyLoaded = false;
  var systemFullyLoaded = false;

  return new Promise(function(resolve) {
    var start = Date.now();

    runner
      .reboot()
      .then(function() {
        runner.setup();

        debug('Waiting for System boot');

        runner.dispatcher.on('performanceentry', function handler(entry) {
          // Due to a bug in the Flame's ability to keep consistent time after
          // a reboot, we are currently overriding the time of the event. Not
          // very accurate, but it's better than nothing
          entry.epoch = entry.name === 'deviceReboot' ?
            start : Date.now();

          debug('Received performance entry `%s` for %s',
            entry.name, entry.context);

          if (entry.name !== 'fullyLoaded') {
            return;
          }

          if (entry.context === VERTICAL_CONTEXT) {
            homescreenFullyLoaded = true;
          } else if (entry.context === SYSTEM_CONTEXT) {
            systemFullyLoaded = true;
          }

          if (homescreenFullyLoaded && systemFullyLoaded) {
            runner.dispatcher.removeListener('performanceentry', handler);
            resolve();
          }
        });
      });
  });
};

/**
 * Retry handler which is invoked if a test run fails to complete. Currently
 * does nothing to handle a retry.
 * @returns {Promise}
 */
Reboot.prototype.retry = noop;

/**
 * Report the results for an individual test run
 * @returns {Promise}
 */
Reboot.prototype.handleRun = function() {
  var results = this.format(this.results, 'reboot', 'deviceReboot');
  return this.report(results);
};

module.exports = Reboot;
