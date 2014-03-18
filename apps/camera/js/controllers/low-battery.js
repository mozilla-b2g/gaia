define(function(require, exports, module) {
  /*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('lib/bind-all');
var debug = require('debug')('controller:lowbattery');
var bind = require('lib/bind');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new LowBatteryController(app);
};
exports.LowBatteryController = LowBatteryController;
/**
 * Initialize a new `LowBatteryController`
 *
 * @param {Object} options
 */

function LowBatteryController(app) {
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

LowBatteryController.prototype.bindEvents = function() {
  bind(this.battery, 'levelchange', this.onLevelChange);
  bind(this.battery, 'chargingchange', this.onLevelChange);
  this.app.on('settings:configured', this.onLevelChange);
};

/**
 * onLevelChange to handle low battery scenario
 *
 * @param {Object} options
 */

LowBatteryController.prototype.onLevelChange = function () {
  var status = this.getStatus(this.battery);
  if (status) {
    this.app.set('batteryStatus', status.value);
    if (status.value !== 'critical') {
      this.notification.clearPersistent();
    }
    if (status.message) {
      this.notification.showNotification(status);
    }
  }
};

LowBatteryController.prototype.getStatus = function (battery) {
  var value = Math.round(battery.level * 100);
  var isCharging = battery.charging;
  
  var level = { value:'healthy' };
  if (isCharging) {
    level.value = 'charging';
    return level;
  }

  if (value <= this.shutdown) {
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