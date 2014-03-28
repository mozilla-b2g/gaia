define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var formatPictureSizes = require('lib/picture-sizes/format-picture-sizes');
var formatRecorderProfiles = require('lib/format-recorder-profiles');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new SettingsController(app); };
module.exports.SettingsController = SettingsController;

/**
 * Initialize a new `SettingsController`
 *
 * @constructor
 * @param {App} app
 */
function SettingsController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.notification = app.views.notification;

  // Allow test stubs
  this.l10n = app.l10n || navigator.mozL10n;
  this.SettingsView = app.SettingsView || SettingsView;
  this.formatPictureSizes = app.formatPictureSizes || formatPictureSizes;
  this.formatRecorderProfiles = app.formatRecorderProfiles ||
    formatRecorderProfiles;

  this.configure();
  this.bindEvents();
  debug('initialized');
}

SettingsController.prototype.configure = function() {
  this.settings.alias('recorderProfiles', this.aliases.recorderProfiles);
  this.settings.alias('pictureSizes', this.aliases.pictureSizes);
  this.settings.alias('flashModes', this.aliases.flashModes);
};

/**
 * Bind to app events.
 *
 * @private
 */
SettingsController.prototype.bindEvents = function() {
  this.app.on('change:capabilities', this.onCapabilitiesChange);
  this.app.on('settings:toggle', this.toggleSettings);
};

/**
 * Toggle the settings menu open/closed.
 *
 * @private
 */
SettingsController.prototype.toggleSettings = function() {
  if (this.view) { this.closeSettings(); }
  else { this.openSettings(); }
};

/**
 * Render and display the settings menu.
 *
 * We use settings.menu() to retrieve
 * and ordered list of settings that
 * have a `menu` property.
 *
 * @private
 */
SettingsController.prototype.openSettings = function() {
  debug('open settings');
  if (this.view) { return; }

  var items = this.menuItems();
  this.view = new this.SettingsView({ items: items })
    .render()
    .appendTo(this.app.el)
    .on('click:close', this.closeSettings)
    .on('click:option', this.onOptionTap);

  this.app.emit('settings:opened');
  debug('settings opened');
};

/**
 * Destroy the settings menu.
 *
 * @private
 */
SettingsController.prototype.closeSettings = function() {
  debug('close settings');
  if (!this.view) { return; }
  this.view.destroy();
  this.view = null;
  this.app.emit('settings:closed');
  debug('settings closed');
};

/**
 * Selects the option that was
 * clicked on the setting.
 *
 * @param  {String} key
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.onOptionTap = function(key, setting) {
  setting.select(key);
  this.closeSettings();
  this.notify(setting);
};

/**
 * Display a notifcation showing the
 * current state of the given setting.
 *
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.notify = function(setting) {
  var optionTitle = this.localize(setting.selected('title'));
  var settingTitle = this.localize(setting.get('title'));
  var message = settingTitle + '<br/>' + optionTitle;

  this.notification.display({ text: message });
};

SettingsController.prototype.localize = function(value) {
  return this.l10n.get(value) || value;
};

/**
 * When the hardware capabilities change
 * we update the available options for
 * each setting to match what is available.
 *
 * The rest of the app should listen for
 * the 'settings:configured' event as an
 * indication to update UI etc.
 *
 * @param  {Object} capabilities
 */
SettingsController.prototype.onCapabilitiesChange = function(capabilities) {
  debug('new capabilities');

  this.settings.hdr.filterOptions(capabilities.hdr);
  this.settings.flashModesPicture.filterOptions(capabilities.flashModes);
  this.settings.flashModesVideo.filterOptions(capabilities.flashModes);

  this.configurePictureSizes(capabilities.pictureSizes);
  this.configureRecorderProfiles(capabilities.recorderProfiles);

  // Let the rest of the app
  // know we're good to go.
  this.app.emit('settings:configured');
  debug('settings configured to new capabilities');
};

/**
 * Formats the raw pictureSizes into
 * a format that Setting class can
 * work with, then resets the pictureSize
 * options.
 *
 * @param  {Array} sizes
 */
SettingsController.prototype.configurePictureSizes = function(sizes) {
  var setting = this.settings.pictureSizes;
  var maxPixelSize = setting.get('maxPixelSize');
  var exclude = setting.get('exclude');
  var options = {
    exclude: exclude,
    maxPixelSize: maxPixelSize,
    mp: this.l10n.get('mp')
  };
  var formatted = this.formatPictureSizes(sizes, options);

  setting.resetOptions(formatted);
  setting.emit('configured');
};

/**
 * Formats the raw recorderProfiles
 * into a format that Setting class can
 * work with, then resets the recorderProfile
 * options.
 *
 * @param  {Array} sizes
 */
SettingsController.prototype.configureRecorderProfiles = function(sizes) {
  var setting = this.settings.recorderProfiles;
  var exclude = setting.get('exclude');
  var options = { exclude: exclude };
  var formatted = this.formatRecorderProfiles(sizes, options);

  setting.resetOptions(formatted);
  setting.emit('configured');
};

/**
 * Returns a list of settings
 * based on the `settingsMenu`
 * cofiguration.
 *
 * If any `conditions` are defined
 * they must pass to be in the list.
 *
 * @return {Array}
 */
SettingsController.prototype.menuItems = function() {
  var items = this.settings.settingsMenu.get('items');
  return items.filter(this.validMenuItem, this)
    .map(function(item) { return this.settings[item.key]; }, this);
};

/**
 * Tests if the passed `settingsMenu`
 * item is allowed in the settings menu.
 *
 * Should:
 *
 *   1. Be a currently supported setting
 *   2. Pass a defined condition
 *
 * @param  {Object} item
 * @return {Boolean}
 */
SettingsController.prototype.validMenuItem = function(item) {
  var setting = this.settings[item.key];
  return !!setting && setting.supported();
};

/**
 * Settings aliases provide
 * convenient pointers to
 * specific settings based on
 * the state of other settings.
 *
 * @type {Object}
 */
SettingsController.prototype.aliases = {
  recorderProfiles: {
    map: {
      back: 'recorderProfilesBack',
      front: 'recorderProfilesFront'
    },
    get: function() {
      var camera = this.settings.cameras.selected('key');
      return this.settings[this.map[camera]];
    }
  },
  pictureSizes: {
    map: {
      back: 'pictureSizesBack',
      front: 'pictureSizesFront'
    },
    get: function() {
      var camera = this.settings.cameras.selected('key');
      return this.settings[this.map[camera]];
    }
  },
  flashModes: {
    map: {
      video: 'flashModesVideo',
      picture: 'flashModesPicture'
    },
    get: function() {
      var mode = this.settings.mode.selected('key');
      return this.settings[this.map[mode]];
    }
  }
};

});
