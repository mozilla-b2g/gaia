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
  for (var key in data) {
    this.data[key] = this.normalizeItem(key, data[key]);
  }
};

Config.prototype.normalizeItem = function(key, value) {
  debug('normalising %s', key);
  return {
    title: value.title || key,
    options: value.options || [{ key: key, value: value }],
    selected: value.selected || 0,
    persistent: value.persistent || false,
    menu: value.menu || false
  };
};

Config.prototype.get = function(key) {
  return arguments.length ? this.data[key] : this.data;
};

});