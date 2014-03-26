define(function(require, exports, module) {
'use strict';

/**
 * TODO: Controllers should create views
 */

/**
 * Dependencies
 */

var debug = require('debug')('controller:controls');
var bindAll = require('lib/bind-all');

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
  this.activity = app.activity;
  this.controls = app.views.controls;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

ControlsController.prototype.bindEvents = function() {
  this.app.settings.on('change:mode', this.controls.setter('mode'));
  this.app.on('newthumbnail', this.onNewThumbnail);
  this.app.on('camera:ready', this.controls.enable);
  this.app.on('camera:busy', this.controls.disable);
  this.app.on('change:recording', this.controls.setter('recording'));
  this.app.on('camera:timeupdate', this.controls.setVideoTimer);
  this.controls.on('click:capture', this.app.firer('capture'));
  this.controls.on('click:gallery', this.onGalleryButtonClick);
  this.controls.on('click:thumbnail', this.app.firer('preview'));
  this.controls.on('click:switch', this.onSwitchButtonClick);
  this.controls.on('click:cancel', this.onCancelButtonClick);
  this.app.on('timer:started', this.onTimerStarted);
  this.app.on('timer:cleared', this.onTimerEnded);
  this.app.on('timer:ended', this.onTimerEnded);
  debug('events bound');
};

ControlsController.prototype.configure = function() {
  var isSwitchable = this.app.settings.mode.get('options').length > 1;
  var initialMode = this.app.settings.mode.selected('key');
  var isCancellable = !!this.app.activity.active;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !this.app.activity.active && !this.app.inSecureMode;

  this.controls.set('gallery', showGallery);
  this.controls.set('cancel', isCancellable);
  this.controls.set('switchable', isSwitchable);
  this.controls.set('mode', initialMode);

  debug('cancelable: %s', isCancellable);
  debug('switchable: %s', isSwitchable);
  debug('gallery: %s', showGallery);
  debug('mode: %s', initialMode);
};

/**
 * When the thumbnail changes, update it in the view.
 * This method is triggered by the 'newthumbnail' event.
 * That event is emitted by the preview gallery controller when the a new
 * photo or video is added, or when the preview is closed and the first
 * photo or video has changed (because of a file deletion).
 */
ControlsController.prototype.onNewThumbnail = function(thumbnailBlob) {
  if (thumbnailBlob) {
    this.controls.setThumbnail(thumbnailBlob);
  } else {
    this.controls.removeThumbnail();
  }
};

/**
 * Forces the capture button to
 * look pressed while the timer is
 * counting down and disables buttons.
 *
 * @private
 */
ControlsController.prototype.onTimerStarted = function() {
  this.controls.set('capture-active', true);
  this.controls.disable();
};

/**
 * Restores the capture button to its
 * unpressed state and re-enables buttons.
 *
 * @private
 */
ControlsController.prototype.onTimerEnded = function() {
  this.controls.set('capture-active', false);
  this.controls.enable();
};

ControlsController.prototype.onSwitchButtonClick = function() {
  this.controls.disable();
  this.app.settings.mode.next();
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
 * @private
 */
ControlsController.prototype.onCancelButtonClick = function() {
  this.activity.cancel();
};

/**
 * Open the gallery app when the
 * gallery button is pressed.
 *
 * @private
 */
ControlsController.prototype.onGalleryButtonClick = function(event) {
  event.stopPropagation();

  var MozActivity = window.MozActivity;
  var controls = this.controls;

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) { return; }

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });

  // Wait 2000ms before re-enabling the
  // Gallery to be launched (Bug 957709)
  controls.disable();
  setTimeout(controls.enable, 2000);
};

});
