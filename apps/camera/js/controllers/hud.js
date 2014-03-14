define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:hud');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

exports = module.exports = function(app) { return new HudController(app); };
exports.HudController = HudController;

/**
 * Initialize a new `HudController`
 *
 * @param {AppController} app
 * @constructor
 *
 */
function HudController(app) {
  bindAll(this);
  this.app = app;
  this.hud = app.views.hud;
  this.settings = app.settings;
  this.notification = app.views.notification;
  this.configure();
  this.bindEvents();
  debug('initialized');
}

/**
 * Initially configure state.
 *
 * @private
 */
HudController.prototype.configure = function() {
  var hasDualCamera = this.settings.cameras.get('options').length > 1;
  var showSettings = this.settings.showSettings.selected('value');
  this.hud.enable('settings', showSettings);
  this.hud.enable('camera', hasDualCamera);
};

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 * @private
 */
HudController.prototype.bindEvents = function() {
  this.app.settings.flashModes.on('change:selected', this.updateFlash);
  this.app.settings.on('change:mode', this.onModeChange);
  this.hud.on('click:settings', this.app.firer('settings:toggle'));
  this.hud.on('click:camera', this.onCameraClick);
  this.hud.on('click:flash', this.onFlashClick);
  this.app.on('settings:configured', this.updateFlash);
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:ready', this.onCameraReady);
  this.app.on('camera:busy', this.hud.hide);
  this.app.on('timer:started', this.hud.hide);
  this.app.on('timer:cleared', this.hud.show);
};

HudController.prototype.onModeChange = function() {
  this.clearNotifications();
  this.updateFlash();
};

HudController.prototype.onCameraClick = function() {
  this.clearNotifications();
  this.app.settings.get('cameras').next();
};

HudController.prototype.clearNotifications = function() {
  this.notification.clear(this.flashNotification);
};

/**
 * Cycle to the next available flash
 * option, update the HUD view and
 * show a change notification.
 *
 * @private
 */
HudController.prototype.onFlashClick = function() {
  var setting = this.settings.flashModes;

  setting.next();
  this.hud.set('flashMode' , setting.selected('key'));
  this.notify(setting);
};

HudController.prototype.notify = function(setting) {
  var optionTitle = setting.selected('title');
  var title = setting.get('title');
  var html = title + '<br/>' + optionTitle;

  this.flashNotification = this.notification.display({ text: html });
};

HudController.prototype.updateFlash = function() {
  var setting = this.settings.flashModes;
  var selected = setting && setting.selected();
  var hasFlash = !!selected;

  this.hud.enable('flash', hasFlash);
  this.hud.setFlashMode(selected);
};


HudController.prototype.onCameraReady = function() {
  // If the camera is ready but we are recording we don't show
  var recording = this.app.get('recording');
  if (recording) {
    return;
  }
  this.hud.show();
};

/**
 * Toggles the visibility of the view
 * depending on recording state.
 *
 * @param  {Boolean} recording
 * @private
 */
HudController.prototype.onRecordingChange = function(recording) {
  this.hud.toggle(!recording);
};

});
