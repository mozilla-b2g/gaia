define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('settings');
var allDone = require('lib/all-done');
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
  this.addEach(items);
  this.storageKey = 'settings';
}

Settings.prototype.add = function(data) {
  var setting = new Setting(data);
  var self = this;
  this.items.push(setting);
  this.ids[setting.key] = this[setting.key] = setting;
  setting.on('change:selected', function() { self.onSettingChange(setting); });
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

Settings.prototype.onSettingChange = function(setting) {
  debug('setting change %s', setting.key);
  this.fire('change:' + setting.key, setting.value(), setting);
};

Settings.prototype.persistent = function(key) {
  debug('get persistent');
  return this.items.filter(function(item) {
    return item.get('persistent');
  });
};

Settings.prototype.menu = function(key) {
  return this.items
    .filter(function(item) { return !!item.get('menu'); })
    .sort(function(a, b) { return a.get('menu') - b.get('menu'); });
};


Settings.prototype.value = function(key, value) {
  var item = this.get(key);
  switch (arguments.length) {
    case 1: return item && item.value();
    case 2: return item && item.value(value);
  }
};

Settings.prototype.toggler = function(key) {
  return (function() { this.get(key).next(); }).bind(this);
};

Settings.prototype.fetch = function(done) {
  var persistent = this.persistent();
  var all = allDone();
  debug('fetching %d settings', persistent.length);
  persistent.forEach(function(setting) { setting.fetch(all()); });
  all(done);
};

Settings.prototype.forEach = function(fn) { this.items.forEach(fn); };
Settings.prototype.filter = function(fn) { return this.items.filter(fn); };



/**
 * Saves state model to persist
 * storage. Debounced by 2secs.
 *
 * @private
 */
// App.prototype.onStateChange = function(keys) {
//   var persistent = this.config.persistent();
//   var isPersistent = function(key) { return !!~persistent.indexOf(key); };
//   var filtered = keys.filter(isPersistent);
//   if (filtered.length) {
//     clearTimeout(this.saveTimeout);
//     this.saveTimeout = setTimeout(this.saveValues, 2000);
//     debug('%d persistent keys changed', filtered.length);
//   }
// };

});