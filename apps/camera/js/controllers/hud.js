define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:hud');
var debounce = require('lib/debounce');
var bindAll = require('lib/bind-all');
var HudView = require('views/hud');

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
  this.settings = app.settings;
  this.notification = app.views.notification;
  this.createView();
  this.bindEvents();
  debug('initialized');
}

/**
 * Create and configure the HUD view.
 *
 * Disable flash button until we know
 * whether the hardware has flash.
 *
 * @private
 */
HudController.prototype.createView = function() {
  var hasDualCamera = this.settings.cameras.get('options').length > 1;
  this.view = this.app.views.hud || new HudView(); // test hook
  this.view.enable('camera', hasDualCamera);
  this.view.disable('flash');
  this.view.hide();
  this.updateCamera();
  this.view.appendTo(this.app.el);
};

/**
 * Bind callbacks to events.
 *
 * @return {HudController} for chaining
 * @private
 */
HudController.prototype.bindEvents = function() {

  // App
  this.app.on('change:recording', this.view.setter('recording'));
  this.app.on('ready', this.view.setter('camera', 'ready'));
  this.app.on('busy', this.view.setter('camera', 'busy'));

  // We need the app to be first localized before localizing the hud view.
  this.app.on('localized', this.localize);

  // Settings
  this.app.once('settings:configured', this.view.show);
  this.app.on('settings:configured', this.updateFlashSupport);
  this.app.settings.flashModes.on('change:selected', this.updateFlashMode);
  this.app.settings.mode.on('change:selected', this.updateFlashMode);
  this.app.settings.cameras.on('change:selected', this.updateCamera);

  // We 'debouce' some UI callbacks to prevent
  // thrashing the hardware when a user taps repeatedly.
  // This means the first calback will fire instantly but
  // subsequent events will be blocked for given time period.
  this.view.on('click:camera', debounce(this.onCameraClick, 500, true));
  this.view.on('click:settings', this.app.firer('settings:toggle'));
  this.view.on('click:flash', this.onFlashClick);

  // Countdown
  this.app.on('countdown:started', this.view.setter('countdown', 'active'));
  this.app.on('countdown:ended', this.view.setter('countdown', 'inactive'));

  // Settings
  this.app.on('settings:opened', this.view.hide);
  this.app.on('settings:closed', this.view.show);

  // Preview gallery
  this.app.on('previewgallery:opened', this.view.hide);
  this.app.on('previewgallery:closed', this.view.show);
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
  var optionTitle = '<span data-l10n-id="' +
    setting.selected('title') + '"></span>';
  var title = '<span data-l10n-id="' + setting.get('title') +'"></span>';
  var html;

  // Check if the `hdr` setting is going to be deactivated as part
  // of the change in the `flashMode` setting and display a specialized
  // notification if that is the case
  if (hdrDeactivated) {
    html = title + ' ' + optionTitle + '<br/>' +
      '<span data-l10n-id="hdr-deactivated"></span>';
  } else {
    html = title + '<br/>' + optionTitle;
  }

  this.flashNotification = this.notification.display({ text: {html: html} });
};

/**
 * Localize hud view when app is localized or locale updated.
 */
HudController.prototype.localize = function() {
  this.view.setFlashModeLabel(this.settings.flashModes.selected());
  this.view.setCameraLabel(this.settings.cameras.selected());
  this.view.setMenuLabel();
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
