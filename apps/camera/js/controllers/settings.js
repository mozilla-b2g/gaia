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
  this.settings = app.settings;
  this.configure();
  this.bindEvents();
  //this.items = new Model(app.config.menu());
  debug('initialized');
}

SettingsController.prototype.configure = function() {
  this.settings.get('cameras').configureOptions(this.app.camera.cameraList);
};

SettingsController.prototype.bindEvents = function() {
  this.app.on('change:capabilities', this.onCapabilitiesChange);
  this.app.on('click', this.toggleSettings);
};

SettingsController.prototype.openSettings = function() {
  if (this.view) { return; }
  var collection = settings.menuItems();
  this.view = new SettingsView({ collection: collection }).render();
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

SettingsController.prototype.onCapabilitiesChange = function(capabilities) {
  this.app.settings.forEach(function(setting) {
    var key = setting.key;

    if (!(key in capabilities)) { return; }

    var options = capabilities[setting.key];
    //var formatted = this.formatHardwareOptions(key, options);

    setting.configureOptions(options);
  });
};

SettingsController.prototype.formatHardwareOptions = function(key, options) {
  switch (key) {
    case 'pictureSizes':
    case 'videoSizes':
      return options;
    default: return options;
  }
};

});
