define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');

/**
 * Locals
 */

var proto = ControlsController.prototype;

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new ControlsController(app);
};

function ControlsController(app) {
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.activity = app.activity;
  this.camera = app.camera;
  this.app = app;

  // Bind context
  bindAll(this);
  this.bindEvents();
  this.setup();
}

proto.bindEvents = function() {
  var controls = this.controls;
  var camera = this.camera;

  // Bind events
  camera.on('focusFailed', controls.enableButtons);
  camera.on('previewResumed', controls.enableButtons);
  camera.on('preparingToTakePicture', controls.disableButtons);
  camera.state.on('change:videoElapsed', this.onVideoTimeUpdate);
  camera.state.on('change:recording', this.onRecordingChange);
  camera.state.on('change:mode', this.onCameraModeChange);

  // Respond to UI events
  controls.on('click:switch', this.onSwitchButtonClick);
  controls.on('click:capture', this.onCaptureButtonClick);
  controls.on('click:cancel', this.onCancelButtonClick);
  controls.on('click:gallery', this.onGalleryButtonClick);
};

proto.setup = function() {
  var activity = this.activity;
  var controls = this.controls;
  var mode = this.camera.getMode();
  var isCancellable = activity.active;
  var showCamera = !activity.active || activity.allowedTypes.image;
  var showVideo = !activity.active || activity.allowedTypes.video;
  var isSwitchable = showVideo && showCamera;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !activity.active && !this.app.inSecureMode;

  controls.set('mode', mode);
  controls.set('gallery', showGallery);
  controls.set('cancel', isCancellable);
  controls.set('switchable', isSwitchable);
};

proto.onCameraModeChange = function(value) {
  this.controls.set('mode', value);
};

proto.onRecordingChange = function(value) {
  this.controls.set('recording', value);
};

proto.onVideoTimeUpdate = function(value) {
  this.controls.setVideoTimer(value);
};

/**
 * Fades the viewfinder out,
 * changes the camera capture
 * mode. Then fades the viewfinder
 * back in.
 *
 */
proto.onSwitchButtonClick = function() {
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
proto.onCancelButtonClick = function() {
  this.activity.cancel();
};

/**
 * Open the gallery app
 * when the gallery button
 * is pressed.
 *
 */
proto.onGalleryButtonClick = function() {
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
proto.onCaptureButtonClick = function() {
  var position = this.app.geolocation.position;
  this.camera.capture({ position: position });
};

});
