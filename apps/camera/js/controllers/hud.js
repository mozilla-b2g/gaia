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
  var camerasSetting = this.app.settings.cameras;
  var hasDualCamera = camerasSetting.get('options').length > 1;
  this.hud.enable('settings', this.app.settings.value('showSettings'));
  this.hud.set('flashMode', this.app.settings.value('flashModes'));
  this.hud.enable('camera', hasDualCamera);
};

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 * @private
 */
HudController.prototype.bindEvents = function() {
  this.app.settings.on('change:flashModes', this.hud.setFlashMode);
  this.app.settings.on('change:mode', this.configureFlash);
  this.hud.on('click:settings', this.app.firer('settings:toggle'));
  this.hud.on('click:camera', this.onCameraClick);
  this.hud.on('click:flash', this.onFlashClick);
  this.app.on('settings:configured', this.onSettingsConfigured);
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:busy', this.disableButtons);
  this.app.on('camera:ready', this.enableButtons);
};

HudController.prototype.onSettingsConfigured = function() {
  this.configureFlash();
};

HudController.prototype.onCameraClick = function() {
  this.app.settings.get('cameras').next();
};

HudController.prototype.onFlashClick = function() {
  this.flashSetting.next();
};

HudController.prototype.configureFlash = function() {
  var newFlash = this.getFlashSetting();
  var oldFlash = this.flashSetting;

  // Remove old listners and add new
  if (oldFlash) { oldFlash.off('change', this.updateFlash); }
  if (newFlash) { newFlash.on('change', this.updateFlash); }

  // Store new flash and update UI
  this.flashSetting = newFlash;
  this.updateFlash();
};

HudController.prototype.updateFlash = function() {
  var setting = this.flashSetting;
  var selected = setting && setting.selected();
  var hasFlash = !!selected;
  this.hud.enable('flash', hasFlash);
  this.hud.setFlashMode(selected);
};

HudController.prototype.enableButtons = function() {
  this.hud.enable('buttons');
};

HudController.prototype.disableButtons = function() {
  this.hud.disable('buttons');
};

HudController.prototype.getFlashSetting = function() {
  var mode = this.app.settings.mode.value();
  return this.app.settings.get(mode + 'FlashModes');
};

HudController.prototype.onRecordingChange = function(recording) {
  this.hud.hide('flash', recording);
  this.hud.hide('camera', recording);
};

});
