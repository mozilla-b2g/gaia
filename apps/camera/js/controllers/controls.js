define(function(require, exports, module) {
'use strict';

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
  bindAll(this);
  this.app = app;
  this.activity = app.activity;
  this.createView();
  this.bindEvents();
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
  this.app.on('newthumbnail', this.onNewThumbnail);
  this.app.once('loaded', this.onceAppLoaded);
  this.app.on('busy', this.onCameraBusy);
  this.app.on('localized', this.view.localize);

  // View
  this.view.on('modechanged', this.onViewModeChanged);
  this.view.on('click:thumbnail', this.app.firer('preview'));
  this.view.on('click:cancel', this.onCancelButtonClick);
  this.view.on('click:capture', this.onCaptureClick);

  // Timer
  this.app.on('timer:started', this.onTimerStarted);
  this.app.on('timer:cleared', this.onTimerStopped);
  this.app.on('timer:ended', this.onTimerStopped);

  // Settings
  this.app.on('settings:opened', this.onSettingsOpened);
  this.app.on('settings:closed', this.onSettingsClosed);

  // Preview gallery
  this.app.on('previewgallery:opened', this.view.hide);
  this.app.on('previewgallery:closed', this.view.show);

  debug('events bound');
};

/**
 * Create and configure the view.
 *
 * @private
 */
ControlsController.prototype.createView = function() {
  var initialMode = this.app.settings.mode.selected('key');
  var cancellable = !!this.app.activity.pick;

  // Create the view (test hook)
  this.view = this.app.views.controls || new ControlsView();

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  this.view.set('cancel', cancellable);
  this.view.setMode(initialMode);

  // Disable view until camera
  // 'ready' enables it.
  this.view.disable();

  // Put it in the DOM
  this.view.appendTo(this.app.el);

  debug('cancelable: %s', cancellable);
  debug('mode: %s', initialMode);
};

/**
 * Disables the switch if there is
 * only one modes available.
 *
 * This is only the case if an activity
 * indicated it only supports one mode,
 * just 'picture' or 'video'.
 *
 * @private
 */
ControlsController.prototype.configureMode = function() {
  var switchable = this.app.settings.mode.get('options').length > 1;
  if (!switchable) { this.view.disable('switch'); }
};

/**
 * Once the app is loaded, we can enable
 * the controls. We also bind a listener
 * that enabled the controls whenever
 * the camera becomes 'ready' from
 * hereon after.
 *
 * @private
 */
ControlsController.prototype.onceAppLoaded = function() {
  this.app.on('ready', this.restore);
  this.view.enable();
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
  var active;
  if (recording === 'started') {
    active = true;
  } else if (recording === 'stopped') {
    active = false;
  } else {
    return;
  }
  this.view.set('recording', active);
  if (!recording) { this.onRecordingEnd(); }
  // Update capture button label when recording changes.
  this.view.setCaptureLabel(active);
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
 * counting down and hides controls.
 *
 * @private
 */
ControlsController.prototype.onTimerStarted = function() {
  this.captureHighlightOn();
  this.view.set('timer', 'active');
};

/**
 * Forces the capture button to
 * look unpressed when the timer
 * stops and shows controls.
 *
 * @private
 */
ControlsController.prototype.onTimerStopped = function() {
  this.captureHighlightOff();
  this.view.set('timer', 'inactive');
};

/**
 * Make controls invisible to the screen reader since they are behind settings
 * overlay.
 *
 * @private
 */
ControlsController.prototype.onSettingsOpened = function() {
  this.view.setScreenReaderVisible(false);
};

/**
 * Make controls visible to the screen reader again when settings are closed.
 *
 * @private
 */
ControlsController.prototype.onSettingsClosed = function() {
  this.view.setScreenReaderVisible(true);
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
 * Switch to the next capture mode:
 * 'picture' or 'video', when the
 * mode is changed via the view.
 *
 * Them mode can be changed by either
 * tapping or swiping the mode switch.
 *
 * @private
 */
ControlsController.prototype.onViewModeChanged = function() {
  debug('view mode changed');
  this.app.settings.mode.next();
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
