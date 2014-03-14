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
  this.camera = app.camera;
  this.battery = navigator.battery || navigator.mozBattery;
  this.lowbattery = app.settings.lowbattery;
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
  var low = this.lowbattery.get('low');
  var verylow = this.lowbattery.get('verylow');
  var critical = this.lowbattery.get('critical');
  var shutdown = this.lowbattery.get('shutdown');
  var healthy = this.lowbattery.get('healthy');
  var charging = this.lowbattery.get('charging');
  var level = healthy;

  if (isCharging) {
    return charging;
  }

   if (value <= low.level) {
    level = low;
  }

  if (value <= verylow.level) {
    level = verylow;
  }

  if (value <= critical.level) {
    level = critical;
  }

  if (value <= shutdown.level) {
    this.shutDownCamera();
    level = shutdown;
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