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

/**
 * Initialize a new `Config`
 *
 * @constructor
 * @param {Object} data
 */
function Config(data) {
  this.data = {};
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
  if (!data) { return; }

  var newItem;
  var key;

  for (key in data) {
    this.data[key] = this.normalizeItem(key, data[key]);
  }
};

Config.prototype.normalizeItem = function(key, value) {
  return {
    title: value.title || key,
    options: value.options || [{ key: value }],
    default: value.default || 0,
    persistent: value.persistent || false,
    menu: value.menu || false
  };
};

Config.prototype.menu = function() {
  return this.processed.menu;
};

Config.prototype.get = function(key) {
  return arguments.length ? this.data[key] : this.data;
};

Config.prototype.options = function(key) {
  var item = this.get(key);
  return item && item.options;
};

Config.prototype.values = function() {
  return this.processed.values;
};

Config.prototype.persistent = function() {
  return this.processed.persistent;
};

});