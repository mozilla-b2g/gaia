define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('config');

/**
 * Exports
 */

module.exports = Config;

/**
 * Locals
 */

var has = {}.hasOwnProperty;

function Config(data) {
  this.data = data;
  this.processed = {
    persistent: [],
    menu: [],
    values: {}
  };
  this.set(data);
}

/**
 * Set new data onto the
 * underlying config model.
 *
 * Data is preprocessed into required
 * formats so that retrieval is quick.
 *
 * @return {Object}
 */
Config.prototype.set = function(data) {
  var item;
  for (var key in data) {
    item = data[key];
    item.key = key;

    // Derive a value from the items
    this.processed.values[key] = (typeof item === 'object') ?
      item['default'] : item;

    // Unless its marked as `persist: false`
    // push it into the persistent object.
    if (item.persist !== false) {
      this.processed.persistent.push(key);
    }

    // If the item has a `menu` key, push it onto the menu list.
    if (has.call(item, 'menu')) { this.processed.menu.push(item); }
  }

  // Sort the menu items by the given `menu` key in config json
  this.processed.menu.sort(function(a, b) { return a.menu - b.menu; });
  debug('processed', this.processed);
};

Config.prototype.menu = function() {
  return this.processed.menu;
};

Config.prototype.get = function(key) {
  return arguments.length ? this.data[key] : this.data;
};

Config.prototype.values = function() {
  return this.processed.values;
};

Config.prototype.persistent = function() {
  return this.processed.persistent;
};

});