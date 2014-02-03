define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:hud');

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
  this.hud.set('flashMode', this.app.settings.value('flashMode'));
  this.hud.set('flashMode', this.app.settings.value('flashMode'));
};

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 * @private
 */
HudController.prototype.bindEvents = function() {
  var flash = this.app.settings.get('flashModes');
  var cameras = this.app.settings.get('cameras');

  flash.on('change:options', this.onFlashOptionsChange);
  cameras.on('change:options', this.onCameraOptionsChange);
  flash.on('change:value', this.hud.setter('flash'));

  this.hud.on('click:camera', this.onCameraClick);
  this.hud.on('click:flash', this.onFlashClick);
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:loading', this.disableButtons);
  this.app.on('camera:busy', this.disableButtons);
  this.app.on('camera:ready', this.enableButtons);
};

HudController.prototype.onCameraClick = function() {
  this.app.settings.get('selectedCamera').next();
};

HudController.prototype.onFlashClick = function() {
  this.app.settings.get('flashMode').next();
};

HudController.prototype.onCameraOptionsChange = function(options) {
 this.hud.enable('camera', !!options.length);
};

HudController.prototype.onFlashOptionsChange = function(options) {
 this.hud.enable('flash', !!options.length);
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
