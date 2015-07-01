var Phase = require('./phase');
var Dispatcher = require('../dispatcher');
var Promise = require('promise');
var util = require('util');
var performanceParser = require('../parsers/performance');
var debug = require('debug')('raptor:restart-b2g');
var noop = function() {};

var VERTICAL_CONTEXT = 'verticalhome.gaiamobile.org';
var SYSTEM_CONTEXT = 'system.gaiamobile.org';

/**
 * Create a suite runner which achieves a ready state when b2g has been restarted
 * @param {{
 *   runs: Number,
 *   timeout: Number,
 *   retries: Number
 * }} options
 * @constructor
 */
var RestartB2G = function(options) {
  Phase.call(this, options);

  this.title = 'Restart B2G';
  this.start();
};

util.inherits(RestartB2G, Phase);

/**
 * Manually instantiate a Dispatcher and listen for performance entries
 */
RestartB2G.prototype.setup = function() {
  this.device.log.restart();
  this.dispatcher = new Dispatcher(this.device);
  this.registerParser(performanceParser);
  this.capture('performanceentry');
};

/**
 * Perform a b2g restart
 * @returns {Promise}
 */
RestartB2G.prototype.restart = function() {
  var runner = this;

  return this.getDevice()
    .then(function() {
      return runner.device.log.clear();
    })
    .then(function() {
      return runner.device.util.restartB2G();
    })
    .then(function(time) {
      return runner.device.log.mark('deviceB2GStart', time);
    });
};

/**
 * Stand up a b2g restart for each individual test run. Will denote the run
 * has completed its work when the System marks the end of the logo screen.
 * @returns {Promise}
 */
RestartB2G.prototype.testRun = function() {
  var runner = this;
  var homescreenFullyLoaded = false;
  var systemFullyLoaded = false;

  return new Promise(function(resolve) {
    runner
      .restart()
      .then(function() {
        runner.setup();

        debug('Waiting for System start');

        runner.dispatcher.on('performanceentry', function handler(entry) {
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
RestartB2G.prototype.retry = noop;

/**
 * Report the results for an individual test run
 * @returns {Promise}
 */
RestartB2G.prototype.handleRun = function() {
  var results = this.format(this.results, 'restartb2g', 'deviceB2GStart');
  return this.report(results);
};

module.exports = RestartB2G;
