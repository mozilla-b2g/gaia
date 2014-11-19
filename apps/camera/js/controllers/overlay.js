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
  this.l10nGet = app.l10nGet;
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
  this.app.on('camera:closed', this.onCameraError);
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
 * @param  {String} type  ['nospace'|'unavailable'|'request-fail'|'mediaserver']
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
  var self = this;
  if (!this.app.localized()) {
    this.app.showSpinner();
    this.app.on('localized', onLocalized);
    return;
  }

  function onLocalized() {
    self.app.clearSpinner();
    self.createOverlay(type, callback);
  }

  var data = this.getOverlayData(type);
  if (!data) {
    if (typeof callback === 'function') {
      callback(null);
    }
    return;
  }

  var overlay = new Overlay({
    type: type,
    data: data
  }).appendTo(document.body)
    .on('click:close', function() {
      self.app.emit('activitycanceled');
    })
    .on('click:reboot', function() {
      self.app.emit('activitycanceled');
      self.app.emit('reboot');
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

  if (this.activity.pick && type !== 'request-fail') {
    data.action = 'close';
  }

  data.actionButtonText = this.l10nGet('close-button');

  switch (type) {
    case 'unavailable':
      data.title = this.l10nGet('nocard2-title');
      data.body = this.l10nGet('nocard3-text');
    break;
    case 'nospace':
      data.title = this.l10nGet('nospace2-title');
      data.body = this.l10nGet('nospace2-text');
    break;
    case 'shared':
      data.title = this.l10nGet('pluggedin2-title');
      data.body = this.l10nGet('pluggedin2-text');
    break;
    case 'shutdown':
      data.title = this.l10nGet('battery-shutdown-title');
      data.body = this.l10nGet('battery-shutdown-text');
    break;
    case 'request-fail':
      data.title = this.l10nGet('camera-unavailable-title');
      data.body = this.l10nGet('camera-unavailable-text');
    break;
    case 'mediaserver-fail':
      data.title = this.l10nGet('camera-fatal-error-title');
      data.body = this.l10nGet('camera-mediaserver-fail-text');
      data.action = 'reboot';
      data.actionButtonText = this.l10nGet('reboot-button');
    break;
    default:
      return false;
  }

  return data;
};

});
