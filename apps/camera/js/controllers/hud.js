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
  this.app.settings.on('change:mode', this.updateFlash);
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

  debug('updated flash enabled: %, mode: %s', hasFlash, selected);
};

});
