define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('lib/bindAll');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');

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
    .on('click:item', this.onItemClick)
    .on('click:option', this.onOptionClick);

  debug('settings opened');
};

SettingsController.prototype.closeSettings = function() {
  if (!this.view) { return; }
  this.view.destroy();
  this.view = null;
};

SettingsController.prototype.onItemClick = function(key) {
  this.settings.get(key).next();
};

SettingsController.prototype.onOptionClick = function(key, value) {
  this.settings.get(key).value(value);
};

SettingsController.prototype.toggleSettings = function() {
  if (this.view) { this.closeSettings(); }
  else { this.openSettings(); }
};

SettingsController.prototype.onCapabilitiesChange = function(capabilities) {
  this.app.settings.forEach(function(setting) {
    if (!(setting.key in capabilities)) { return; }
    var options = capabilities[setting.key];
    setting.configureOptions(options);
  });
};

});
