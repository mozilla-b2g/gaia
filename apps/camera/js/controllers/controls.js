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

module.exports = function(app) { return new ControlsController(app); };
module.exports.ControlsController = ControlsController;

/**
 * Initialize a new `ControlsController`
 *
 * @param {App} app
 */
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

/**
 * Event bindings.
 *
 * @private
 */
ControlsController.prototype.bindEvents = function() {
  this.app.settings.mode.on('change:selected', this.controls.setter('mode'));

  // App
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:shutter', this.captureHighlightOff);
  this.app.on('camera:busy', this.controls.disable);
  this.app.on('timer:started', this.onTimerStarted);
  this.app.on('newthumbnail', this.onNewThumbnail);
  this.app.on('timer:cleared', this.restore);
  this.app.on('camera:ready', this.restore);

  // Controls
  this.controls.on('click:thumbnail', this.app.firer('preview'));
  this.controls.on('click:switch', this.onSwitchButtonClick);
  this.controls.on('click:cancel', this.onCancelButtonClick);
  this.controls.on('click:capture', this.onCaptureClick);

  debug('events bound');
};

/**
 * Initial configuration.
 *
 * @private
 */
ControlsController.prototype.configure = function() {
  var isSwitchable = this.app.settings.mode.get('options').length > 1;
  var initialMode = this.app.settings.mode.selected('key');
  var isCancellable = !!this.app.activity.active;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.

  this.controls.set('cancel', isCancellable);
  this.controls.set('switchable', isSwitchable);
  this.controls.set('mode', initialMode);

  debug('cancelable: %s', isCancellable);
  debug('switchable: %s', isSwitchable);
  debug('mode: %s', initialMode);
};

/**
 * Keep capture button pressed and
 * fire the `capture` event to allow
 * the camera to repond.
 *
 * When the 'camera:shutter' event fires
 * we remove the capture butter pressed
 * state so that it times with the
 * capture sound effect.
 *
 * @private
 */
ControlsController.prototype.onCaptureClick = function() {
  this.captureHighlightOn();
  this.app.emit('capture');
};

/**
 * Set the recording attribute on
 * the view to allow it to style
 * accordingly.
 *
 * @param  {Boolean} recording
 * @private
 */
ControlsController.prototype.onRecordingChange = function(recording) {
  this.controls.set('recording', recording);
  if (!recording) { this.onRecordingEnd(); }
};

/**
 * Remove the capture highlight,
 * once recording has finished.
 *
 * @private
 */
ControlsController.prototype.onRecordingEnd = function() {
  this.captureHighlightOff();
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
  this.captureHighlightOn();
  this.controls.disable();
};

/**
 * Restores the capture button to its
 * unpressed state and re-enables buttons.
 *
 * @private
 */
ControlsController.prototype.restore = function() {
  this.captureHighlightOff();
  this.controls.enable();
};

/**
 * Make the capture button
 * appear pressed.
 *
 * @private
 */
ControlsController.prototype.captureHighlightOn = function() {
  this.controls.set('capture-active', true);
};

/**
 * Remove the pressed apperance
 * from the capture button.
 *
 * @private
 */
ControlsController.prototype.captureHighlightOff = function() {
  this.controls.set('capture-active', false);
};

/**
 * Switch to the next capture
 * mode: 'picture' or 'video'.
 *
 * @private
 */
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
