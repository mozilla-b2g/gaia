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
  this.app.on('change:recording', this.controls.setter('recording'));
  this.app.on('camera:timeupdate', this.controls.setVideoTimer);
  this.controls.on('click:capture', this.app.firer('capture'));
  this.controls.on('click:gallery', this.onGalleryButtonClick);
  this.controls.on('click:switch', this.app.settings.toggler('mode'));
  this.controls.on('click:cancel', this.onCancelButtonClick);
  this.app.on('camera:loading', this.disableButtons);
  this.app.on('camera:ready', this.enableButtons);
  this.app.on('camera:busy', this.disableButtons);
  debug('events bound');
};

ControlsController.prototype.configure = function() {
  var isSwitchable = this.app.settings.mode.get('options').length > 1;
  var initialMode = this.app.settings.mode.value();
  var isCancellable = !!this.app.activity.active;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !this.app.activity.active && !this.app.inSecureMode;

  this.controls.set('gallery', showGallery);
  this.controls.set('cancel', isCancellable);
  this.controls.set('switchable', isSwitchable);
  this.controls.set('mode', initialMode);
};

ControlsController.prototype.disableButtons = function() {
  this.controls.disable('buttons');
};

ControlsController.prototype.enableButtons = function() {
  this.controls.enable('buttons');
};

ControlsController.prototype.onSwitchClick = function() {
  this.app.settings.get('mode').next();
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

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) { return; }

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

});
