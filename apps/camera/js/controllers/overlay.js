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
  this.localize = app.localize;
  this.batteryOverlay = null;
  this.storageOverlay = null;
  this.bindEvents();
  debug('initialized');
}

OverlayController.prototype.bindEvents = function() {
  this.app.on('storage:changed', this.onStorageChanged);
  this.app.on('change:batteryStatus', this.onBatteryChanged);
};

/**
 * Respond to storage `statechange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} value  ['nospace'|'shared'|'unavailable'|'available']
 */
OverlayController.prototype.onStorageChanged = function(state) {
  debug('storage changed: \'%s\'', state);

  if (this.storageOverlay) {
    this.storageOverlay.destroy();
    this.storageOverlay = null;
  }

  if (state !== 'available') {
    this.storageOverlay = this.createOverlay(state);
  }
};

/**
 * Respond to battery `statuschange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} status  ['shutdown'|'critical'|'verylow'|'low']
 */
OverlayController.prototype.onBatteryChanged = function(state) {
  debug('battery state change: \'%s\'', state);

  if (this.batteryOverlay) {
    this.batteryOverlay.destroy();
    this.batteryOverlay = null;
  }

  if (state === 'shutdown') {
    this.batteryOverlay = this.createOverlay(state);
  }
};

OverlayController.prototype.createOverlay = function(type) {
  var data = this.getOverlayData(type);
  var self = this;

  if (!data) { return; }

  var isClosable = this.activity.pick;
  var overlay = new Overlay({
    type: type,
    closable: isClosable,
    data: data
  });

  overlay
    .appendTo(document.body)
    .on('click:close-btn', function() {
      self.app.emit('activitycanceled');
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
  var data = {};

  switch (type) {
    case 'unavailable':
      data.title = this.localize('nocard2-title');
      data.body = this.localize('nocard3-text');
    break;
    case 'nospace':
      data.title = this.localize('nospace2-title');
      data.body = this.localize('nospace2-text');
    break;
    case 'shared':
      data.title = this.localize('pluggedin2-title');
      data.body = this.localize('pluggedin2-text');
    break;
    case 'shutdown':
      data.title = this.localize('battery-shutdown-title');
      data.body = this.localize('battery-shutdown-text');
    break;
    default:
      return false;
  }

  data.closeButtonText = this.localize('close-button');

  return data;
};

});
