define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var storage = require('asyncStorage');
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
  this.items.push(setting);
  this.ids[setting.key] = setting;
  setting.on('change:value', this.firer('change:' + setting.key));
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

Settings.prototype.setValues = function(values) {
  for (var key in values) { this.value(key, values[key]); }
};

Settings.prototype.persistent = function(key) {
  return this.items.filter(function(item) {
    return item.persist;
  });
};

Settings.prototype.menu = function(key) {
  return this.items
    .filter(function(item) { return item.menu; })
    .sort(function(a, b) { return a.menu - b.menu; });
};


Settings.prototype.value = function(key, value) {
  var item = this.get(key);
  switch (arguments.length) {
    case 1: return item && item.value();
    case 2: return item && item.value(value);
  }
};

Settings.prototype.persistentValues = function(key, value) {
  var items = this.persistent();
  var data = {};
  items.forEach(function(item) { data[item.id] = item.get('value'); });
  return data;
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