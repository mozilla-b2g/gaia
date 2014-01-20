define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:controls');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new ControlsController(app);
};

function ControlsController(app) {
  debug('initializing');
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.activity = app.activity;
  this.camera = app.camera;
  this.app = app;
  bindAll(this);
  this.bindEvents();
  this.setup();
  debug('initialized');
}

ControlsController.prototype.bindEvents = function() {
  var controls = this.controls;
  var camera = this.camera;

  // Bind events
  camera.on('focusFailed', controls.enableButtons);
  camera.on('previewResumed', controls.enableButtons);
  camera.on('preparingToTakePicture', controls.disableButtons);
  camera.on('change:videoElapsed', this.onVideoTimeUpdate);
  camera.on('change:recording', this.onRecordingChange);
  camera.on('change:mode', this.onCameraModeChange);

  // Respond to UI events
  controls.on('click:switch', this.onSwitchButtonClick);
  controls.on('click:capture', this.onCaptureButtonClick);
  controls.on('click:cancel', this.onCancelButtonClick);
  controls.on('click:gallery', this.onGalleryButtonClick);

  debug('events bound');
};

ControlsController.prototype.setup = function() {
  var activity = this.activity;
  var controls = this.controls;
  var isCancellable = activity.active;
  var showCamera = !activity.active || activity.allowedTypes.image;
  var showVideo = !activity.active || activity.allowedTypes.video;
  var isSwitchable = showVideo && showCamera;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !activity.active && !this.app.inSecureMode;

  controls.set('mode', this.camera.get('mode'));
  controls.set('gallery', showGallery);
  controls.set('cancel', isCancellable);
  controls.set('switchable', isSwitchable);
};

ControlsController.prototype.onCameraModeChange = function(value) {
  this.controls.set('mode', value);
  debug('camera mode change: %s', value);
};

ControlsController.prototype.onRecordingChange = function(value) {
  this.controls.set('recording', value);
};

ControlsController.prototype.onVideoTimeUpdate = function(value) {
  this.controls.setVideoTimer(value);
};

/**
 * Fades the viewfinder out,
 * changes the camera capture
 * mode. Then fades the viewfinder
 * back in.
 *
 */
ControlsController.prototype.onSwitchButtonClick = function() {
  var controls = this.controls;
  var viewfinder = this.viewfinder;
  var camera = this.camera;

  camera.toggleMode();
  controls.disableButtons();
  viewfinder.fadeOut(onFadeOut);

  function onFadeOut() {
    camera.loadStreamInto(viewfinder.el, onStreamLoaded);
  }

  function onStreamLoaded() {
    controls.enableButtons();
    viewfinder.fadeIn();
  }
};

/**
 * Cancel the current activity
 * when the cancel button is
 * pressed.
 *
 * This means the device will
 * navigate back to the app
 * that initiated the activity.
 *
 */
ControlsController.prototype.onCancelButtonClick = function() {
  this.activity.cancel();
};

/**
 * Open the gallery app
 * when the gallery button
 * is pressed.
 *
 */
ControlsController.prototype.onGalleryButtonClick = function() {
  var MozActivity = window.MozActivity;

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) {
    return;
  }

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });
};

/**
 * Capture when the capture
 * button is pressed.
 *
 */
ControlsController.prototype.onCaptureButtonClick = function() {
  var position = this.app.geolocation.position;
  this.camera.capture({ position: position });

  // Disable controls for 500ms to
  // prevent rapid fire button bashing.
  this.controls.disableButtons();
  setTimeout(this.controls.enableButtons, 500);
};

});
