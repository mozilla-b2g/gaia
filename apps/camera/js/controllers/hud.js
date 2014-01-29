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

exports = module.exports = create;
exports.HudController = HudController;

/**
 * Create new `HudController`
 * and bind events.
 *
 * @param  {AppController} app
 * @return {HudController}
 *
 */
function create(app) {
  return new HudController(app).bindEvents();
}

/**
 * Initialize a new `HudController`
 *
 * @param {AppController} app
 * @constructor
 *
 */
function HudController(app) {
  debug('initializing');
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.hud = app.views.hud;
  this.camera = app.camera;
  bindAll(this);
  debug('initialized');
}

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 */
HudController.prototype.bindEvents = function() {
  var hud = this.hud;
  this.camera.on('configured', this.onCameraConfigured);
  //this.camera.on('streamloaded', this.onStreamLoaded);
  //this.camera.on('previewresumed', this.hud.enableButtons);
  //this.camera.on('preparingtotakepicture', this.hud.disableButtons);
  //this.camera.on('change:state', function(){});
  //this.camera.on('change:recording', this.hud.setter('disabled'));

  /**
   * Camera States:
   *
   * - 'idle'
   * - 'focusing'
   * - 'focusfound'
   * - 'focusfail'
   * - 'recording'
   */
};

/**
 * Update UI when a new
 * camera is configured.
 */
HudController.prototype.onCameraConfigured = function(camera) {
  this.hud.enable('toggleCamera', camera.supports('frontCamera'));
  this.hud.enable('toggleFlash', camera.supports('flash'));
};

HudController.prototype.onStreamLoaded = function() {
  this.hud.enable('buttons');
};

});
