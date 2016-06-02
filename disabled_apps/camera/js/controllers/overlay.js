define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:overlay');
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
  this.overlays = {};
  this.app = app;
  this.require = app.require;
  this.activity = app.activity;
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
  this.updateOverlay('storage', state !== 'available', state);
};

/**
 * Respond to battery `statuschange`
 * events by inserting or destroying
 * overlays from the app.
 *
 * @param  {String} status  ['shutdown'|'critical'|'verylow'|'low']
 */
OverlayController.prototype.onBatteryChanged = function(state) {
  this.updateOverlay('battery', state === 'shutdown', state);
};

/**
 * Respond to camera `requesting`
 * events by destroying overlays
 * from the app.
 *
 * @param  {String} state  ['start'|'success'|'fail']
 */
OverlayController.prototype.onCameraRequesting = function() {
  this.updateOverlay('cameraError', false);
};

/**
 * Respond to camera `error`
 * events by inserting overlays
 * into the app.
 *
 * @param  {String} state  ['start'|'success'|'fail']
 */
OverlayController.prototype.onCameraError = function(type) {
  this.updateOverlay('cameraError', true, type);
};

OverlayController.prototype.updateOverlay = function(type, enabled, reason) {
  debug('\'%s/%s\' overlay %s', type, reason, enabled);

  var overlay = this.overlays[type];
  if (!overlay) {
    overlay = this.overlays[type] = {
      id: 0,
    };
  }

  if (overlay.view) {
    overlay.view.destroy();
    delete overlay.view;
  }

  var id = ++overlay.id;
  if (!enabled) {
    return;
  }

  var self = this;
  this.require(['views/overlay'], function(OverlayView) {
    if (id !== overlay.id) {
      return;
    }

    var closable = self.activity.pick && type !== 'request-fail';
    var view = new OverlayView({
      type: reason,
      closable: closable,
    });
    if (!view.rendered()) {
      return;
    }

    overlay.view = view.appendTo(document.body)
      .on('click:close-btn', function() {
        self.app.emit('activitycanceled');
      });

    debug('inserted \'%s/%s\' overlay', type, reason);
  });
};

});
