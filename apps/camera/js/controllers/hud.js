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

module.exports = function(app) { return new HudController(app); };
module.exports.HudController = HudController;

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
  this.l10n = app.l10n || navigator.mozL10n;
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
  this.app.settings.mode.on('change:selected', this.updateFlash);
  this.app.on('settings:configured', this.updateFlash);

  // View
  this.hud.on('click:settings', this.app.firer('settings:toggle'));
  this.hud.on('click:camera', this.onCameraClick);
  this.hud.on('click:flash', this.onFlashClick);

  // Camera
  this.app.on('camera:ready', this.hud.setter('camera', 'ready'));
  this.app.on('camera:busy', this.hud.setter('camera', 'busy'));
  this.app.on('change:recording', this.hud.setter('recording'));

  // Timer
  this.app.on('timer:cleared', this.hud.setter('timer', 'inactive'));
  this.app.on('timer:started', this.hud.setter('timer', 'active'));
  this.app.on('timer:ended', this.hud.setter('timer', 'inactive'));
};

HudController.prototype.onModeChange = function() {
  this.clearNotifications();
  this.updateFlash();
};

HudController.prototype.onCameraClick = function() {
  this.clearNotifications();
  this.app.settings.cameras.next();
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

/**
 * Display a notifcation showing the
 * current state of the given setting.
 *
 * @param  {Setting} setting
 * @private
 */
HudController.prototype.notify = function(setting) {
  var optionTitle = this.l10n.get(setting.selected('title'));
  var title = this.l10n.get(setting.get('title'));
  var html = title + '<br/>' + optionTitle;

  this.flashNotification = this.notification.display({ text: html });
};

HudController.prototype.updateFlash = function() {
  var selected = this.settings.flashModes.selected();
  var supported = this.settings.flashModes.supported();

  this.hud.enable('flash', supported);
  this.hud.setFlashMode(selected);

  debug('updated flash enabled: %, mode: %s', supported, selected);
};

});
