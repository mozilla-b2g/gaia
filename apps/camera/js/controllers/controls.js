define(function(require, exports, module) {
'use strict';

/**
 * TODO: Controllers should create views
 */

/**
 * Dependencies
 */

var debug = require('debug')('controller:controls');
var ControlsView = require('views/controls');
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
  this.view = app.views.controls || new ControlsView();
  this.app.views.controls = this.view;
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
  this.app.settings.mode.on('change:selected', this.view.setMode);
  this.app.settings.mode.on('change:options', this.configureMode);

  // App
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:shutter', this.captureHighlightOff);
  this.app.on('timer:started', this.onTimerStarted);
  this.app.on('newthumbnail', this.onNewThumbnail);
  this.app.on('camera:busy', this.onCameraBusy);
  this.app.on('timer:cleared', this.restore);
  this.app.on('camera:ready', this.restore);

  // View
  this.view.on('modechanged', this.onViewModeChanged);
  this.view.on('click:thumbnail', this.app.firer('preview'));
  this.view.on('click:cancel', this.onCancelButtonClick);
  this.view.on('click:capture', this.onCaptureClick);

  debug('events bound');
};

/**
 * Initial configuration.
 *
 * @private
 */
ControlsController.prototype.configure = function() {
  var initialMode = this.app.settings.mode.selected('key');
  var isCancellable = !!this.app.activity.pick;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  this.view.set('cancel', isCancellable);
  this.view.setMode(initialMode);

  // Disable view until camera
  // 'ready' enables it.
  this.view.set('faded');
  this.view.disable();

  this.configureMode();

  // Put it in the DOM
  this.view.appendTo(this.app.el);

  debug('cancelable: %s', isCancellable);
  debug('mode: %s', initialMode);
};

ControlsController.prototype.configureMode = function() {
  var isSwitchable = this.app.settings.mode.get('options').length > 1;
  this.view.set('switchable', isSwitchable);
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
  this.view.set('recording', recording);
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
    this.view.setThumbnail(thumbnailBlob);
  } else {
    this.view.removeThumbnail();
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
  this.view.disable();
};

ControlsController.prototype.onCameraBusy = function() {
  this.view.disable();
};

/**
 * Restores the capture button to its
 * unpressed state and re-enables buttons.
 *
 * @private
 */
ControlsController.prototype.restore = function() {
  debug('restore');
  this.captureHighlightOff();
  this.view.unset('faded');
  this.view.enable();
};

/**
 * Make the capture button
 * appear pressed.
 *
 * @private
 */
ControlsController.prototype.captureHighlightOn = function() {
  this.view.set('capture-active');
};

/**
 * Remove the pressed apperance
 * from the capture button.
 *
 * @private
 */
ControlsController.prototype.captureHighlightOff = function() {
  this.view.unset('capture-active');
};

/**
 * Switch to the next capture
 * mode: 'picture' or 'video'.
 *
 * @private
 */
ControlsController.prototype.onViewModeChanged = function(mode) {
  debug('view mode changed mode: %s', mode);
  var setting = this.app.settings.mode;
  this.view.disable();
  if (mode) { setting.select(mode); }
  else { setting.next(); }
};


ControlsController.prototype.onCancelButtonClick = function() {
  this.app.emit('activitycanceled');
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
  this.view.disable();
  setTimeout(this.view.enable, 2000);
};

});
