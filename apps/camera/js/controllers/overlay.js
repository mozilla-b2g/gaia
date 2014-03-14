define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:overlay');
var Overlay = require('views/overlay');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new OverlayController(app); };
module.exports.OverlayController = OverlayController;

/**
 * Initialize a new `OverlayController`
 *
 * @param {App} app
 */
function OverlayController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.activity = app.activity;
  this.storage = app.storage;
  this.batteryOverlay = null;
  this.storageOverlay = null;
  this.bindEvents();
  debug('initialized');
}

OverlayController.prototype.bindEvents = function() {
  this.storage.on('statechange', this.onStorageStateChange);
  this.app.on('change:batteryStatus', this.onBatteryStatusChange);
};

/**
 * Respond to storage `statechange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} value  ['nospace'|'shared'|'unavailable'|'available']
 */
OverlayController.prototype.onStorageStateChange = function(value) {
  debug('storage state change: \'%s\'', value);

  if (this.storageOverlay) {
    this.storageOverlay.destroy();
    this.storageOverlay = null;
  }

  if (value !== 'available') {
    this.storageOverlay = this.createOverlay(value);
  }
};

/**
 * Respond to battery `statuschange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} status  ['shutdown'|'critical'|'verylow'|'low']
 */
OverlayController.prototype.onBatteryStatusChange = function(status) {
  debug('battery state change: \'%s\'', status);

  if (this.batteryOverlay) {
    this.batteryOverlay.destroy();
    this.batteryOverlay = null;
  }

  if (status === 'shutdown') {
    this.batteryOverlay = this.createOverlay(status);
  }
};

OverlayController.prototype.createOverlay = function(type) {
  var data = this.getOverlayData(type);
  var activity = this.activity;

  if (!data) {
    return;
  }

  var isClosable = activity.active;
  var overlay = new Overlay({
    type: type,
    closable: isClosable,
    data: data
  });

  overlay
    .appendTo(document.body)
    .on('click:close-btn', function() {
      activity.cancel();
    });

  debug('inserted \'%s\' overlay', type);
  return overlay;
};

/**
 * Get the overlay data required
 * to render a specific type of overlay.
 *
 * @param  {String} type
 * @return {Object}
 */
OverlayController.prototype.getOverlayData = function(type) {
  var l10n = navigator.mozL10n;
  var data = {};

  switch (type) {
    case 'unavailable':
      data.title = l10n.get('nocard2-title');
      data.body = l10n.get('nocard3-text');
    break;
    case 'nospace':
      data.title = l10n.get('nospace2-title');
      data.body = l10n.get('nospace2-text');
    break;
    case 'shared':
      data.title = l10n.get('pluggedin-title');
      data.body = l10n.get('pluggedin-text');
    break;
    case 'shutdown':
      data.title = l10n.get('battery-shutdown-title');
      data.body = l10n.get('battery-shutdown-text');
    break;
    default:
      return false;
  }

  data.closeButtonText = l10n.get('close-button');

  return data;
};

});
