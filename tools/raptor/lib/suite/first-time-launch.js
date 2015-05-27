var Phase = require('./phase');
var Promise = require('promise');
var util = require('util');

/**
 * Create a suite runner which achieves a ready state when an application is
 * simulated to launch for the first time ever
 * @param {{}} options
 * @constructor
 */
var FirstTimeLaunch = function(options) {
  Phase.call(this, options);

  this.title = 'First-time Launch';
  this.start();
};

util.inherits(FirstTimeLaunch, Phase);

/**
 * Stand up an application first-time launch for each individual test run.
 */
FirstTimeLaunch.prototype.testRun = function() {
  throw new Error('Not implemented');
};

/**
 * Retry handler which is invoked if a test run fails to complete.
 */
FirstTimeLaunch.prototype.retry = function() {
  throw new Error('Not implemented');
};

/**
 * Functionality to execute after each run, e.g. reporting results
 */
FirstTimeLaunch.prototype.handleRun = function() {
  throw new Error('Not implemented');
};

module.exports = FirstTimeLaunch;
