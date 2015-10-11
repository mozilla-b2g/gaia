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
 * Initialize a new `BatteryController`
 *
 * @param {Object} options
 */
function BatteryController(app) {
  bindAll(this);
  this.app = app;
  this.battery = app.battery || navigator.battery || navigator.mozBattery;
  this.levels = app.settings.battery.get('levels');
  this.notification = app.views.notification;
  this.bindEvents();
  this.updateStatus();
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
  this.app.on('change:batteryStatus', this.onStatusChange);
  this.app.on('change:recording', this.updatePowerSave);

  var mozSettings = navigator.mozSettings;
  mozSettings.addObserver('powersave.enabled', this.onPowerSaveChange);
  mozSettings.createLock().get('powersave.enabled').then(
    this.onPowerSaveChange);
};

/**
 * Callback from settings when the power save state changes.
 *
 * @private
 */
BatteryController.prototype.onPowerSaveChange = function(values) {
  var value;
  if (values.settingValue !== undefined) {
    value = values.settingValue;
  } else {
    value = values['powersave.enabled'];
  }
  this.powerSaveEnabled = value;
  this.updatePowerSave();
};

/**
 * Emits powersave event if state has changed.
 *
 * @private
 */
BatteryController.prototype.updatePowerSave = function() {
  var state = this.powerSaveEnabled && !this.app.get('recording');
  if (this.powerSave === state) {
    return;
  }

  this.powerSave = state;
  debug('power save: ' + state);
  this.app.emit('battery:powersave', state);
};

/**
 * Map of status keys to message.
 *
 * @type {Object}
 * @private
 */
BatteryController.prototype.notifications = {
  low: {
    text: 'battery-low-text',
    attrs: {
      'data-icon': 'battery-3',
      'data-l10n-id': 'battery-low-indicator'
    },
  },
  verylow: {
    text: 'battery-verylow-text',
    attrs: {
      'data-icon': 'battery-1',
      'data-l10n-id': 'battery-verylow-indicator'
    }
  },
  critical: {
    text: 'battery-critical-text',
    attrs: {
      'data-icon': 'battery-1',
      'data-l10n-id': 'battery-critical-indicator'
    },
    persistent: true
  }
};

/**
 * Updates app `batteryStatus` and
 * manages battery notifications.
 *
 * @private
 */
BatteryController.prototype.updateStatus = function () {
  var previous = this.app.get('batteryStatus');
  var current = this.getStatus(this.battery);
  if (current !== previous) {
    this.app.set('batteryStatus', current);
  }
};

/**
 * Returns a status key derived
 * from the given `battery` object.
 *
 * @param  {Battery} battery
 * @return {String}
 * @private
 */
BatteryController.prototype.getStatus = function(battery) {
  var level = Math.round(battery.level * 100);
  var levels = this.levels;

  if (battery.charging) { return 'charging'; }
  else if (level <= levels.shutdown) { return 'shutdown'; }
  else if (level <= levels.critical) { return 'critical'; }
  else if (level <= levels.verylow) { return 'verylow'; }
  else if (level <= levels.low) { return 'low'; }
  else { return 'healthy'; }
};

BatteryController.prototype.onLocalized = function() {
  this.onStatusChange(this.app.get('batteryStatus'));
};

BatteryController.prototype.onStatusChange = function(status) {
  // We need the app to be first localized
  // before showing the battery status message
  if (!this.app.localized()) {
    this.app.once('localized', this.onLocalized);
    return;
  }

  this.clearLastNotification();
  this.displayNotification(status);
};

BatteryController.prototype.displayNotification = function(status) {
  var notification = this.notifications[status];
  if (!notification) { return; }

  this.lastNotification = this.notification.display({
    text: notification.text,
    className: notification.className,
    attrs: notification.attrs,
    persistent: notification.persistent
  });
};

BatteryController.prototype.clearLastNotification = function() {
  this.notification.clear(this.lastNotification);
};

});
