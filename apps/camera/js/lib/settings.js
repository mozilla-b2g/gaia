define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var SettingAlias = require('./setting-alias');
var debug = require('debug')('settings');
var Setting = require('./setting');
var evt = require('vendor/evt');

/**
 * Mixin emitter
 */

evt(Settings.prototype);

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
  this.addEach(items);
}

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

Settings.prototype.add = function(data) {
  var setting = new Setting(data);
  this.items.push(setting);
  this.ids[setting.key] = this[setting.key] = setting;
  debug('added setting: %', setting.key);
};

Settings.prototype.fetch = function(done) {
  this.items.forEach(function(setting) { setting.fetch(); });
};

Settings.prototype.alias = function(key, options) {
  options.settings = this;
  options.key = key;
  var alias = new this.SettingAlias(options);
  this.aliases[key] = alias;
  this[key] = alias;
};

Settings.prototype.removeAlias = function(key) {
  // TODO: Implement
};

});
