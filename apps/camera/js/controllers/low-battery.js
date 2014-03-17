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
    this.app.emit('batterystatuschange', status);
  }
};

LowBatteryController.prototype.getStatus = function (battery) {
  var value = Math.round(battery.level * 100);
  var isCharging = battery.charging;
  
  var level = this.healthy;
  this.notification.clearPersistentMessage();
  
  if (isCharging) {
    level = this.charging;
  }

   if (value <= this.low.level) {
    level = this.low;
  }

  if (value <= this.verylow.level) {
    level = this.verylow;
  }

  if (value <= this.critical.level) {
    level = this.critical;
  }

  if (value <= this.shutdown.level) {
    this.shutDownCamera();
    level = this.shutdown;
  }

  if (level.notificationID) {
    var messageObj = {
      icon: level.icon ? level.icon : null,
      message: level.notificationID,
      isPersistent: level.isPersistent ?
                  level.isPersistent : false
    };

    this.notification.showNotification(messageObj);
  }
  
  return level;
};

LowBatteryController.prototype.shutDownCamera = function() {
  var camera = this.camera;
  if (camera.get('recording')) {
    camera.stopRecording();
  }
  this.app.emit('shutdown:camera');
};

});