define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

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
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.bindEvents();
  debug('initialized');
}

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
 * Render and display the settings menu.
 *
 * We use settings.menu() to retrieve
 * and ordered list of settings that
 * have a `menu` property.
 *
 * @private
 */
SettingsController.prototype.openSettings = function() {
  if (this.view) { return; }
  debug('open settings');

  var items = this.settings.menu();
  this.view = new SettingsView({ items: items })
    .render()
    .appendTo(this.app.el)
    .on('tap:close', this.closeSettings)
    .on('tap:option', this.onOptionTap);

  debug('settings opened');
};

/**
 * Destroy the settings menu.
 *
 * @private
 */
SettingsController.prototype.closeSettings = function() {
  if (this.view) {
    this.view.destroy();
    this.view = null;
  }
};

/**
 * Selects the option that was
 * tapped on the setting.
 *
 * @param  {String} key
 * @param  {Setting} setting
 * @private
 */
SettingsController.prototype.onOptionTap = function(key, setting) {
  setting.select(key);
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
