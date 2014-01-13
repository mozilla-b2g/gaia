define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:hud');

/**
 * Locals
 */

var proto = HudController.prototype;

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
 *
 */
proto.bindEvents = function() {
  this.hud.on('flashToggle', this.onFlashToggle);
  this.hud.on('cameraToggle', this.onCameraToggle);
  this.camera.on('configured', this.onCameraConfigured);
  this.camera.on('previewResumed', this.hud.enableButtons);
  this.camera.on('preparingToTakePicture', this.hud.disableButtons);
  this.camera.state.on('change:recording', this.onRecordingChange);
  return this;
};

/**
 * Update UI when a new
 * camera is configured.
 *
 */
proto.onCameraConfigured = function() {
  var hasFrontCamera = this.camera.hasFrontCamera();
  var flashMode = this.camera.getFlashMode();
  this.hud.showCameraToggleButton(hasFrontCamera);
  this.hud.setFlashMode(flashMode);
};

/**
 * Toggles the flash on
 * the camera and UI when
 * the flash button is pressed.
 *
 */
proto.onFlashToggle = function() {
  var mode = this.camera.toggleFlash();
  this.hud.setFlashMode(mode);
};

/**
 * Toggle the camera (front/back),
 * fading the viewfinder in between.
 *
 */
proto.onCameraToggle = function() {
  var controls = this.controls;
  var viewfinder = this.viewfinder;
  var camera = this.camera;
  var hud = this.hud;

  controls.disableButtons();
  hud.disableButtons();
  hud.highlightCameraButton(true);
  viewfinder.fadeOut(onFadeOut);

  function onFadeOut() {
    camera.toggleCamera();
    camera.loadStreamInto(viewfinder.el, onStreamLoaded);
  }

  function onStreamLoaded() {
    viewfinder.fadeIn();
    controls.enableButtons();
    hud.enableButtons();
    hud.highlightCameraButton(false);
  }
};

/**
 * Disable the buttons
 * when recording
 *
 * @param  {Boolean} value
 *
 */
proto.onRecordingChange = function(value) {
  this.hud.toggleDisableButtons(value);
};

});
