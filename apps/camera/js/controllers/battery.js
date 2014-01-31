define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bind = require('utils/bind');
var debug = require('debug')('controller:battery');

/**
 * Exports
 */

exports = module.exports = function(app) { return new BatteryController(app); };
exports.BatteryController = BatteryController;

/**
 * Initialze new `BatteryController`
 *
 * @param {App} app
 * @constructor
 */
function BatteryController(app) {
  this.battery = app.battery || navigator.battery || navigator.mozBattery;
  this.levels = { low: 0.15, critical: 0.05 };
  this.app = app;
  this.configure();
  this.healthCheck();
  debug('initialized');
}

/**
 * Initial configuration.
 *
 * @private
 */
BatteryController.prototype.configure = function() {
  bind(this.battery, 'changingchange', this.healthCheck);
  bind(this.battery, 'levelchange', this.healthCheck);
};

/**
 * Check the health of the battery.
 * Events emitted to allow app respond.
 *
 * @private
 */
BatteryController.prototype.healthCheck = function() {
  var status = this.getStatus(this.battery.level);
  this.app.set('battery', status);
  this.app.emit('battery:' + status);
  debug('status: %s', status);
};

/**
 * Get a status key from a
 * given battery level.
 *
 * @param  {Number} level
 * @return {String}
 * @private
 */
BatteryController.prototype.getStatus = function(level) {
  if (level < this.levels.critical) { return 'critical'; }
  else if (level < this.levels.low) { return 'low'; }
  else { return 'healthy'; }
};

});