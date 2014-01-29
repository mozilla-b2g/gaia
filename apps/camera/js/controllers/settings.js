define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');
var Model = require('vendor/model');

/**
 * Locals
 */

var has = {}.hasOwnProperty;

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
  this.items = new Model(app.config.menu());
  debug('initialized');
}

SettingsController.prototype.bindEvents = function() {
  this.app.on('settingsrequest', this.openSettings);
  this.app.on('settingsdismiss', this.closeSettings);
  this.app.on('settingstoggle', this.toggleSettings);
  this.app.on('change:supports', this.onSupportChange);
};

SettingsController.prototype.openSettings = function() {
  if (this.view) { return; }
  var options = { state: this.app, items: this.items };
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

/**
 * When supported features change
 * the menu items list is reset
 * with a filtered version reflecting
 * this support.
 *
 * @param  {Object} supports
 */
SettingsController.prototype.onSupportChange = function(supports) {
  var items = this.app.config.menu();
  var filtered = items.filter(function(item) {
    var defined = has.call(supports, item.key);
    return !defined || supports[item.key];
  });

  this.items.reset(filtered);
  debug('items reset after filtering');
};

});
