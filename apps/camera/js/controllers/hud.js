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

module.exports = function(app) {
  return new HudController(app);
};

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
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 */
HudController.prototype.bindEvents = function() {
  var hud = this.hud;
  this.app.on('camera:busy', this.disableButtons);
  this.app.on('camera:ready', this.enableButtons);
  this.app.on('camera:loading', this.disableButtons);
  this.app.on('camera:recording', this.disableButtons);
  this.app.on('change:supports', this.onSupportChange);
  this.app.on('change:recording', this.onRecordingChange);
};

/**
 * Update UI when a new
 * camera is configured.
 */
HudController.prototype.onSupportChange = function(supports) {
  this.hud.enable('camera', supports.selectedCamera);
  this.hud.enable('flash', supports.flashMode);
};

HudController.prototype.enableButtons = function() {
  this.hud.enable('buttons');
};

HudController.prototype.disableButtons = function() {
  this.hud.disable('buttons');
};

HudController.prototype.onRecordingChange = function(recording) {
  this.hud.hide('flash', !recording);
  this.hud.hide('camera', !recording);
};

});
