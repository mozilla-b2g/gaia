define(function(require, exports, module) {
  /*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('lib/bind-all');
var debug = require('debug')('controller:battery');
var bind = require('lib/bind');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new BatteryController(app);
};
exports.BatteryController = BatteryController;
/**
 * Initialize a new `LowBatteryController`
 *
 * @param {Object} options
 */

function BatteryController(app) {
  this.app = app;
  this.battery = navigator.battery || navigator.mozBattery;
  this.lowbattery = app.settings.lowbattery;
  this.notification = app.views.notification;
  this.low = this.lowbattery.get('low');
  this.verylow = this.lowbattery.get('verylow');
  this.critical = this.lowbattery.get('critical');
  this.shutdown = this.lowbattery.get('shutdown');
  this.healthy = this.lowbattery.get('healthy');
  this.charging = this.lowbattery.get('charging');
  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 */

BatteryController.prototype.bindEvents = function() {
  bind(this.battery, 'levelchange', this.onLevelChange);
  bind(this.battery, 'chargingchange', this.onLevelChange);
  this.app.on('settings:configured', this.onLevelChange);
};

/**
 * onLevelChange to handle low battery scenario
 *
 * @param {Object} options
 */

BatteryController.prototype.onLevelChange = function () {
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
  //If message is available than show the message
  if (status.message) {
    this.notification.showNotification(status);
  }
};

BatteryController.prototype.getStatus = function (battery) {
  var value = Math.round(battery.level * 100);
  var isCharging = battery.charging;
  
  var level = { value:'healthy' };
  if (isCharging) {
    level.value = 'charging';
  } else if (value <= this.shutdown) {
    level.value = 'shutdown';
  } else if (value <= this.critical) {
    level.value = 'critical';
    level.message = 'battery-critical-text';
    level.icon = 'icon-battery-critical';
    level.isPersistent = true;
  }  else if (value <= this.verylow) {
    level.value = 'verylow';
    level.message = 'battery-verylow-text';
    level.icon = 'icon-battery-verylow';
  } else if (value <= this.low) {
    level.value = 'low';
    level.message = 'battery-low-text';
    level.icon = 'icon-battery-low';
  }

  return level;
};

});