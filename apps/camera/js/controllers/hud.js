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
  this.hud.on('click:settings', this.app.firer('settings:toggle'));
  this.hud.on('click:camera', this.onCameraClick);
  this.hud.on('click:flash', this.onFlashClick);
  this.app.on('settings:configured', this.onSettingsConfigured);
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:busy', this.disableButtons);
  this.app.on('camera:ready', this.enableButtons);
};

HudController.prototype.onSettingsConfigured = function() {
  this.updateFlash();
};

HudController.prototype.onCameraClick = function() {
  this.app.settings.get('cameras').next();
};

HudController.prototype.onFlashClick = function() {
  this.settings.flashModes.next();
  this.hud.set('flashMode' , this.settings.flashModes.selected('key'));
};

HudController.prototype.updateFlash = function() {
  var setting = this.settings.flashModes;
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

HudController.prototype.onRecordingChange = function(recording) {
  this.hud.hide('flash', recording);
  this.hud.hide('camera', recording);
};

});
