define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');

/**
 * Exports
 */

module.exports = function(app) {
  return new SettingsController(app);
};

function SettingsController(app) {
  bindAll(this);
  this.app = app;
  this.bindEvents();
  debug('initialized');
}

SettingsController.prototype.bindEvents = function() {
  this.app.on('settingsrequest', this.openSettings);
  this.app.on('settingsdismiss', this.closeSettings);
  this.app.on('settingstoggle', this.toggleSettings);
};

SettingsController.prototype.openSettings = function() {
  if (this.view) { return; }
  var items = this.app.config.menu();
  var options = { state: this.app, items: items };
  this.view = new SettingsView(options).render();
  this.view.appendTo(this.app.el);
  debug('appended menu');
};

SettingsController.prototype.closeSettings = function() {
  if (!this.view) { return; }
  this.view.destroy();
  this.view = null;
};

SettingsController.prototype.toggleSettings = function() {
  if (this.view) { this.closeSettings(); }
  else { this.openSettings(); }
};

});
