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
  bindAll(this);
  this.app = app;
  this.activity = app.activity;
  this.batteryOverlay = null;
  this.storageOverlay = null;
  this.bindEvents();
  debug('initialized');
}

OverlayController.prototype.bindEvents = function() {
  this.app.on('storage:changed', this.onStorageChanged);
  this.app.on('change:batteryStatus', this.onBatteryChanged);
  this.app.on('camera:requesting', this.onCameraRequesting);
  this.app.on('camera:error', this.onCameraError);
};

/**
 * Respond to storage `statechange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} value  ['nospace'|'shared'|'unavailable'|'available']
 */
OverlayController.prototype.onStorageChanged = function(state) {
  var self = this;
  debug('storage changed: \'%s\'', state);

  if (this.storageOverlay) {
    this.storageOverlay.destroy();
    this.storageOverlay = null;
  }

  if (state !== 'available') {
    this.createOverlay(state, onOverlayCreated);
  }

  function onOverlayCreated(overlay) {
    self.storageOverlay = overlay;
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
  var self = this;
  debug('battery state change: \'%s\'', state);

  if (this.batteryOverlay) {
    this.batteryOverlay.destroy();
    this.batteryOverlay = null;
  }

  if (state === 'shutdown') {
    this.createOverlay(state, onOverlayCreated);
  }

  function onOverlayCreated(overlay) {
    self.batteryOverlay = overlay;
  }
};

/**
 * Respond to camera `requesting`
 * events by destroying overlays
 * from the app.
 *
 * @param  {String} state  ['start'|'success'|'fail']
 */
OverlayController.prototype.onCameraRequesting = function() {
  if (this.cameraErrorOverlay) {
    this.cameraErrorOverlay.destroy();
    this.cameraErrorOverlay = null;
  }
};

/**
 * Respond to camera `error`
 * events by inserting overlays
 * into the app.
 *
 * @param  {String} state  ['start'|'success'|'fail']
 */
OverlayController.prototype.onCameraError = function(type) {
  var self = this;
  debug('camera error type: \'%s\'', type);

  this.createOverlay(type, onOverlayCreated);

  function onOverlayCreated(overlay) {
    self.cameraErrorOverlay = overlay;
  }
};

OverlayController.prototype.createOverlay = function(type, callback) {
  var data = this.getOverlayData(type);
  if (!data) {
    if (typeof callback === 'function') {
      callback(null);
    }
    return;
  }

  var closable = this.activity.pick && type !== 'request-fail';

  var overlay = new Overlay({
    type: type,
    closable: closable,
    data: data
  }).appendTo(document.body)
    .on('click:close-btn', function() {
      self.app.emit('activitycanceled');
    });

  debug('inserted \'%s\' overlay', type);

  if (typeof callback === 'function') {
    callback(overlay);
  }
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
      data.title = 'nocard2-title';
      data.body = 'nocard3-text';
    break;
    case 'nospace':
      data.title = 'nospace2-title';
      data.body = 'nospace2-text';
    break;
    case 'shared':
      data.title = 'pluggedin2-title';
      data.body = 'pluggedin2-text';
    break;
    case 'shutdown':
      data.title = 'battery-shutdown-title';
      data.body = 'battery-shutdown-text';
    break;
    case 'request-fail':
      data.title = 'camera-unavailable-title';
      data.body = 'camera-unavailable-text';
    break;
    default:
      return false;
  }

  data.closeButtonText = 'close-button';

  return data;
};

});
