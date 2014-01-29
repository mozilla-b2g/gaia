define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * TODO: Controllers should create views
 */

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
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.activity = app.activity;
  this.controls = app.views.controls;
  this.viewfinder = app.views.viewfinder;
  this.controls.render().appendTo(app.el);
  this.bindEvents();
  this.configure();
  debug('initialized');
}

ControlsController.prototype.bindEvents = function() {
  var controls = this.controls;
  var camera = this.camera;
  camera.on('focusFailed', controls.enableButtons);
  camera.on('previewResumed', controls.enableButtons);
  camera.on('preparingToTakePicture', controls.disableButtons);
  camera.on('change:videoElapsed', this.onVideoTimeUpdate);
  camera.on('change:recording', this.controls.setter('recording'));
  controls.on('click:capture', this.onCaptureButtonClick);
  controls.on('click:cancel', this.onCancelButtonClick);
  controls.on('click:gallery', this.onGalleryButtonClick);
  debug('events bound');
};

ControlsController.prototype.configure = function() {
  var activity = this.activity;
  var controls = this.controls;
  var showCamera = !activity.active || activity.allowedTypes.image;
  var showVideo = !activity.active || activity.allowedTypes.video;
  var isSwitchable = showVideo && showCamera;
  var isCancellable = activity.active;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !activity.active && !this.app.inSecureMode;

  controls.set('gallery', showGallery);
  controls.set('cancel', isCancellable);
  controls.set('switchable', isSwitchable);
};

ControlsController.prototype.onVideoTimeUpdate = function(value) {
  this.controls.setVideoTimer(value);
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

var throttleGalleryLaunch = false;

/**
 * Open the gallery app
 * when the gallery button
 * is pressed.
 *
 */
ControlsController.prototype.onGalleryButtonClick = function(e) {
  e.stopPropagation();
  var MozActivity = window.MozActivity;

  // DEV: Don't commit this!
  return this.app.emit('settingstoggle');

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) {
    return;
  }

  if (throttleGalleryLaunch) {
    return;
  }

  throttleGalleryLaunch = true;

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });

  // Wait 2000ms before re-enabling the Gallery to be launched
  // (Bug 957709)
  window.setTimeout(function() {
    throttleGalleryLaunch = false;
  }, 2000);
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
