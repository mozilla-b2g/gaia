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
  var item = typeof value === 'object' ? value : {};
  item.title = value.title || key;
  item.options = value.options || [{ key: key, value: value }];
  item.persistent = value.persistent || false;
  item.menu = value.menu || false;
  debug('normalised %s', key, item);
  return item;
};

Config.prototype.get = function(key) {
  return arguments.length ? this.data[key] : this.data;
};

});