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
  this.app.on('previewGallery:delete', this.onDeleteDialog);
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

OverlayController.prototype.onDeleteDialog = function(options) {
  if (this.deleteOverlay) {
    this.deleteOverlay.destroy();
    this.deleteOverlay = null;
  }

  this.deleteOverlay = this.createDialog(options);
};

OverlayController.prototype.createDialog = function(options) {
  var data = this.getOverlayData(options.type);

  if (!data) {
    return;
  }

  var overlay = new Overlay({
    type: options.type,
    closable: options.closable,
    fullButton: options.fullButton,
    data: data
  });

  if (!options.full) {
    overlay.setButtonType(options.recommend);
  }

  overlay
    .appendTo(document.body)
    .on('click:close-btn', closeClick)
    .on('click:confirm-btn', confirmClick);

  function closeClick() {
    overlay.el.classList.add('hidden');
  }

  function confirmClick() {
    closeClick();

    if (options.onConfirm) {
      options.onConfirm();
    }
  }

  debug('inserted \'%s\' overlay', options.type);
  return overlay;
};

OverlayController.prototype.createOverlay = function(type) {
  var data = this.getOverlayData(type);
  var activity = this.activity;

  if (!data) {
    return;
  }

  var overlay = new Overlay({
    type: type,
    closable: activity.active,
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
    case 'video':
      data.title = '';
      data.body = l10n.get('delete-video?');
      data.closeButtonText = l10n.get('cancel');
      data.confirmButtonText = l10n.get('delete');
    break;
    case 'photo':
      data.title = '';
      data.body = l10n.get('delete-photo?');
      data.closeButtonText = l10n.get('cancel');
      data.confirmButtonText = l10n.get('delete');
    break;
    default:
      return false;
  }

  if (type !== 'video' && type !== 'photo') {
    data.closeButtonText = l10n.get('close-button');
  }

  return data;
};

});
