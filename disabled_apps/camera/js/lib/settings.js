define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var SettingAlias = require('./setting-alias');
var debug = require('debug')('settings');
var Setting = require('./setting');

/**
 * Exports
 */

module.exports = Settings;

/**
 * Initialize a new 'Setting'
 *
 * @param {Object} items
 */
function Settings(items) {
  this.ids = {};
  this.items = [];
  this.aliases = {};
  this.SettingAlias = SettingAlias; // Test hook
  this.dontSave = this.dontSave.bind(this);
  this.addEach(items);
}

/**
 * Add several Settings in one go.
 *
 * @param {Object} items
 */
Settings.prototype.addEach = function(items) {
  if (!items) { return; }
  var item;
  var key;

  for (key in items) {
    item = items[key];
    item.key = item.key || key;
    this.add(items[key]);
  }
};

/**
 * Add a new Setting to the settings collection.
 *
 * @param {Object} data
 */
Settings.prototype.add = function(data) {
  var setting = new Setting(data);
  this.items.push(setting);
  this.ids[setting.key] = this[setting.key] = setting;
  debug('added setting: %s', setting.key);
};

/**
 * Fetch all the Settings previous
 * state from storage.
 *
 * @public
 */
Settings.prototype.fetch = function() {
  this.items.forEach(function(setting) { setting.fetch(); });
};

/**
 * Prevent all settings from saving
 * when they are changed.
 *
 * This is used in activity sessions
 * whereby we don't want any settings
 * changes to persist to future camera
 * sessions.
 *
 * @public
 */
Settings.prototype.dontSave = function() {
  this.items.forEach(function(setting) {
    setting.off('change:selected', setting.save);
  });
};

/**
 * Add a SettingAlias to the settings.
 * (see lib/setting-alias.js for more info)
 *
 * @param  {Object} options
 * @public
 */
Settings.prototype.alias = function(options) {
  var alias = new this.SettingAlias(options);
  this.aliases[options.key] = alias;
  this[options.key] = alias;
};

Settings.prototype.removeAlias = function(key) {
  // TODO: Implement
};

});
