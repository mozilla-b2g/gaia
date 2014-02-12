define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var SettingOptionsView = require('views/setting-options');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new SettingsController(app); };
module.exports.SettingsController = SettingsController;

function SettingsController(app) {
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.bindEvents();
  debug('initialized');
}

SettingsController.prototype.bindEvents = function() {
  this.app.on('change:capabilities', this.onCapabilitiesChange);
  this.app.on('settings:toggle', this.toggleSettings);
};

SettingsController.prototype.openSettings = function() {
  if (this.view) { return; }
  debug('open settings');

  this.view = new SettingsView({ items: this.settings.menu() });

  this.view
    .render()
    .appendTo(this.app.el)
    .on('click:item', this.onItemClick);

  debug('settings opened');
};

SettingsController.prototype.closeSettings = function() {
  if (!this.view) { return; }
  this.view.destroy();
  this.view = null;
};

SettingsController.prototype.onItemClick = function(key) {
  var setting = this.settings.get(key);
  var view = new SettingOptionsView({ model: setting });

  this.closeSettings();

  view
    .render()
    .appendTo(this.app.el)
    .on('click:item', setting.select);
};

SettingsController.prototype.toggleSettings = function() {
  if (this.view) { this.closeSettings(); }
  else { this.openSettings(); }
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
 * We fire the 'settings:beforeconfigured'
 * event to allow other parts of the app
 * a last chance to manipulate options
 * before they are rendered to the UI.
 *
 * @param  {Object} capabilities
 */
SettingsController.prototype.onCapabilitiesChange = function(capabilities) {
  this.app.settings.forEach(function(setting) {
    var match = setting.key in capabilities;
    if (match) { setting.configureOptions(capabilities[setting.key]); }
  });

  this.app.emit('settings:beforeconfigured');
  this.app.emit('settings:configured');
};

});
