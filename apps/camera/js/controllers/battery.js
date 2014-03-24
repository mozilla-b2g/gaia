define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:battery');
var bindAll = require('lib/bind-all');
var bind = require('lib/bind');

/**
 * Exports
 */

module.exports = function(app) { return new BatteryController(app); };
module.exports.BatteryController = BatteryController;

/**
 * Initialize a new `LowBatteryController`
 *
 * @param {Object} options
 */
function BatteryController(app) {
  bindAll(this);
  this.app = app;
  this.battery = navigator.battery || navigator.mozBattery;
  this.levels = app.settings.battery.get('levels');
  this.notification = app.views.notification;
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 * @private
 */
BatteryController.prototype.bindEvents = function() {
  bind(this.battery, 'levelchange', this.updateStatus);
  bind(this.battery, 'chargingchange', this.updateStatus);
  this.app.on('settings:configured', this.updateStatus);
};

/**
 * Updates app `batteryStatus` and
 * manages battery notifications.
 *
 * @private
 */
BatteryController.prototype.updateStatus = function () {
  var status = this.getStatus(this.battery);
  var previousValue = this.app.get('batteryStatus');
  this.app.set('batteryStatus', status.value);

  // If nothing has changed since last time we checked, then we return.
  if (previousValue && previousValue === status.value) {
    return;
  }

  // If previous state was `critical` and it changes now
  // than we clear the notification because
  // critical notification is persistent
  if (previousValue && previousValue === 'critical') {
    this.notification.hideNotification();
  }

  // If message is available
  // then show the message
  if (status.message) {
    this.notification.showNotification(status);
  }
};

BatteryController.prototype.getStatus = function (battery) {
  var value = Math.round(battery.level * 100);
  var isCharging = battery.charging;
  var level = { value: 'healthy' };

  if (isCharging) {
    level.value = 'charging';
  } else if (value <= this.levels.shutdown) {
    level.value = 'shutdown';
  } else if (value <= this.levels.critical) {
    level.value = 'critical';
    level.message = 'battery-critical-text';
    level.icon = 'icon-battery-critical';
    level.isPersistent = true;
  }  else if (value <= this.levels.verylow) {
    level.value = 'verylow';
    level.message = 'battery-verylow-text';
    level.icon = 'icon-battery-verylow';
  } else if (value <= this.levels.low) {
    level.value = 'low';
    level.message = 'battery-low-text';
    level.icon = 'icon-battery-low';
  }

  return level;
};

});