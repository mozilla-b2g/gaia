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

function Settings(items) {
  this.ids = {};
  this.items = [];
  this.aliases = {
    list: [],
    hash: {}
  };

  this.localize = this.localize.bind(this);
  this.addEach(items);
}

Settings.prototype.add = function(data) {
  var setting = new Setting(data);
  var self = this;
  this.items.push(setting);
  this.ids[setting.key] = this[setting.key] = setting;
  setting.on('change:selected', function() {
    self.onSettingChange(setting.key, setting.selected('key'));
  });
};

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

Settings.prototype.get = function(key) {
  return this.ids[key];
};

Settings.prototype.onSettingChange = function(key, value) {
  debug('setting change %s', key);
  this.fire('change:' + key, value);
};

Settings.prototype.options = function(options) {
  this.items.forEach(function(setting) {
    var match = setting.key in options;
    if (match) {
      debug('reset options key: %s', setting.key);
      setting.resetOptions(options[setting.key]);
    }
  });
};

Settings.prototype.fetch = function() {
  this.items.forEach(function(setting) { setting.fetch(); });
};

Settings.prototype.localize = function() {
  debug('localizing');
  this.items.forEach(function(setting) { setting.localize(); });
  debug('localized');
};

Settings.prototype.alias = function(key, options) {
  options.settings = this;
  options.key = key;
  var alias = new SettingAlias(options);
  this.aliases[key] = alias;
  this[key] = alias;
};

Settings.prototype.getAlias = function(key) {
  var alias = this.aliases[key];
  return alias && alias.get();
};

Settings.prototype.removeAlias = function(key) {
  // TODO: Implement
};

});
