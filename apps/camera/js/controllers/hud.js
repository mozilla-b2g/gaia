define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:hud');
var debounce = require('lib/debounce');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new HudController(app); };
module.exports.HudController = HudController;

/**
 * Initialize a new `HudController`
 *
 * @param {AppController} app
 * @constructor
 *
 */
function HudController(app) {
  bindAll(this);
  this.app = app;
  this.view = app.views.hud;
  this.settings = app.settings;
  this.l10nGet = app.l10nGet;
  this.notification = app.views.notification;
  this.configure();
  this.bindEvents();
  debug('initialized');
}

/**
 * Initially configure state.
 *
 * @private
 */
HudController.prototype.configure = function() {
  var hasDualCamera = this.settings.cameras.get('options').length > 1;
  this.view.enable('camera', hasDualCamera);
  this.updateCamera();

  // Disable flash button until we
  // know whether the hardware has flash
  this.view.enable('flash', false);
};

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 * @private
 */
HudController.prototype.bindEvents = function() {
  this.app.settings.flashModes.on('change:selected', this.updateFlashMode);
  this.app.settings.mode.on('change:selected', this.updateFlashMode);
  this.app.settings.cameras.on('change:selected', this.updateCamera);
  this.app.on('settings:configured', this.updateFlashSupport);
  this.app.once('criticalpathdone', this.view.show);

  // We 'debouce' some UI callbacks to prevent
  // thrashing the hardware when a user taps repeatedly.
  // This means the first calback will fire instantly but
  // subsequent events will be blocked for given time period.
  this.view.on('click:camera', debounce(this.onCameraClick, 500, true));
  this.view.on('click:settings', this.app.firer('settings:toggle'));
  this.view.on('click:flash', this.onFlashClick);

  // Camera
  this.app.on('camera:ready', this.view.enable);
  this.app.on('camera:busy', this.view.disable);
  this.app.on('change:recording', this.view.toggler(true));

  // Timer
  this.app.on('timer:cleared', this.view.show);
  this.app.on('timer:started', this.view.hide);
  this.app.on('timer:ended', this.view.show);

  // Settings
  this.app.on('settings:opened', this.view.hide);
  this.app.on('settings:closed', this.view.show);
};

HudController.prototype.onCameraClick = function() {
  debug('camera clicked');
  this.clearNotifications();
  this.app.settings.cameras.next();
};

HudController.prototype.clearNotifications = function() {
  this.notification.clear(this.flashNotification);
};

/**
 * Cycle to the next available flash
 * option, update the HUD view and
 * show a change notification.
 *
 * @private
 */
HudController.prototype.onFlashClick = function() {
  var setting = this.settings.flashModes;
  var ishdrOn = this.settings.hdr.selected('key') === 'on';

  setting.next();
  this.view.set('flashMode' , setting.selected('key'));
  this.notify(setting, ishdrOn);
};

/**
 * Display a notifcation showing the
 * current state of the given setting.
 *
 * @param  {Setting} setting
 * @private
 */
HudController.prototype.notify = function(setting, hdrDeactivated) {
  var optionTitle = this.l10nGet(setting.selected('title'));
  var title = this.l10nGet(setting.get('title'));
  var html;

  // Check if the `hdr` setting is going to be deactivated as part
  // of the change in the `flashMode` setting and display a specialized
  // notification if that is the case
  if (hdrDeactivated) {
    html = title + ' ' + optionTitle + '<br/>' +
      this.l10nGet('hdr-deactivated');
  } else {
    html = title + '<br/>' + optionTitle;
  }

  this.flashNotification = this.notification.display({ text: html });
};

HudController.prototype.updateFlashMode = function() {
  var selected = this.settings.flashModes.selected();
  if (!selected) { return; }
  this.view.setFlashMode(selected);
  debug('updated flash mode: %s', selected.key);
};

HudController.prototype.updateFlashSupport = function() {
  var supported = this.settings.flashModes.supported();
  this.view.enable('flash', supported);
  this.updateFlashMode();
  debug('flash supported: %s', supported);
};

HudController.prototype.updateCamera = function() {
  var selected = this.settings.cameras.selected();
  if (!selected) { return; }
  this.view.setCamera(selected);
  debug('updated camera: %s', selected.key);
};

});
