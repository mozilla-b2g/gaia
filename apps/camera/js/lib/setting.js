define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('setting');
var storage = require('vendor/cookies');
var model = require('vendor/model');
var mixin = require('lib/mixin');

/**
 * Exports
 */

module.exports = Setting;

/**
 * Mixin `Model` methods
 */

model(Setting.prototype);

/**
 * Initialize a new `Setting`.
 *
 * @param {Object} data
 */
function Setting(data) {
  this.key = data.key;
  this.configure(data);
  this.reset(data, { silent: true });
  this.updateSelected({ silent: true });

  // Bind context
  this.isValidOption = this.isValidOption.bind(this);
  this.inflateOption = this.inflateOption.bind(this);
  this.select = this.select.bind(this);
  this.next = this.next.bind(this);
}

Setting.prototype.configure = function(data) {
  var optionsHash = this.optionsToHash(data.options);
  var options = data.options;

  this._options = {};
  this._options.config = this._options.hash = options.length && optionsHash;

  // Configure options whenever they change
  this.on('change:options', this.onOptionsChange);

  // Save the Setting when it's changed
  if (data.persistent) { this.on('change:selected', this.save); }
};

/**
 * Perform some admin whenever
 * the settings are changed.
 *
 * @private
 */
Setting.prototype.onOptionsChange = function() {
  this.resetOptionsHash();
  this.sortOptions();
  this.updateSelected();
  debug('options changed');
};

/**
 * Converts an options array to
 * a hash with `index` properties.
 *
 * We use this hash to validate
 * incoming options and ot mixin
 * config data with dynamic options.
 *
 * @param  {Array} options
 * @return {undefined|Object}
 */
Setting.prototype.optionsToHash = function(options) {
  var hash = {};
  options.forEach(function(option, index) {
    option.index = index;
    hash[option.key] = option;
  });
  return hash;
};

/**
 * Get the selected option,
 * or just a particular key
 * if given.
 *
 * @param  {String} key
 * @return {Object|*}
 */
Setting.prototype.selected = function(key) {
  var hash = this._options.hash;
  var option = hash[this.get('selected')];
  return key ? option && option[key] : option;
};

/**
 * Select an option.
 *
 * Accepts an string key to select,
 * or an integer index relating to
 * the current options list.
 *
 * Options:
 *
 *  - {Boolean} silent
 *
 * @param {String|Number} key
 * @param {Object} opts  Model#set() options
 */
Setting.prototype.select = function(key, options) {
  var isIndex = typeof key === 'number';
  var list = this.get('options');
  var hash = this._options.hash;
  var selected = isIndex ? list[key] : hash[key];

  // If there are no options, exit
  if (!list.length) { return; }

  // If an option was not found,
  // default to selecting the first.
  if (!selected) { return this.select(0, options); }

  // Store the new choice
  this.set('selected', selected.key, options);
};

/**
 * Completely reset the Setting's options.
 *
 * Passed options go through formatting
 * and validation before being set.
 *
 * @param  {Array|Object} options
 * @public
 */
Setting.prototype.resetOptions = function(options) {
  options = this.format(options || [])
    .filter(this.isValidOption)
    .map(this.inflateOption);

  this.set('options', options);
  this.emit('optionsreset', options);
};

/**
 * Sorts the current options list
 * by their originally defined
 * index in the config JSON.
 *
 * @private
 */
Setting.prototype.sortOptions = function() {
  var options = this.get('options');
  options.sort(function(a, b) { return a.index - b.index; });
};

/**
 * Rebuilds the options hash
 * fresh from the latest options
 * list.
 *
 * We duplicate options in a hash
 * so that we can have super-fast
 * lookups when calling `value()`
 * and `.selected()` methods.
 *
 * We maintain an array becuase the
 * order of options is very important.
 *
 * @private
 */
Setting.prototype.resetOptionsHash = function() {
  var options = this.get('options');
  var hash = this._options.hash = {};
  options.forEach(function(option) { hash[option.key] = option; });
};

/**
 * Silently updates the `selected`
 * property of the Setting.
 *
 * If no selected key is present
 * we attempt to select the last
 * fetched persited selection.
 *
 * @private
 */
Setting.prototype.updateSelected = function() {
  this.select(this.get('selected') || this.fetched, { silent: true });
};

/**
 * Normalizes incoming options data.
 *
 * For settings that need more complex
 * formatting (eg. pictureSizes), you
 * can override this method to perform
 * more bespoke formatting.
 *
 * @param  {Array|Object} options
 * @return {Array}
 */
Setting.prototype.format = function(options) {
  var isArray = Array.isArray(options);
  var normalized = [];

  each(options, function(item, key) {
    var isObject = typeof item === 'object';
    var option = {};

    // The key can come from several places
    option.key = isArray ? (isObject ? item.key : item) : key;
    option.data = item.data || isObject && item || !isArray && item;
    normalized.push(option);
  });

  return normalized;
};

/**
 * Defines whether the given
 * option is valid.
 *
 * An option is 'valid' if it matches
 * one of the defined options keys,
 * in the config JSON.
 *
 * If no options keys are given in the
 * config, all options are valid.
 *
 * @param  {Object}  option
 * @return {Boolean}
 * @private
 */
Setting.prototype.isValidOption = function(option) {
  return !!(this._options.config[option.key] || !this._options.config);
};

/**
 * Mixes any config data into
 * the given option object.
 *
 * This allows us to have an option
 * that comprises partly of config
 * data, and partly of data sourced
 * from hardware capabilites.
 *
 * @param  {Object} option
 * @return {Object}
 * @private
 */
Setting.prototype.inflateOption = function(option) {
  var key = option.key;
  var config = this._options.config;
  var configOption = config && config[key];
  return mixin(option, configOption || {});
};

/**
 * Set the `selected` option to
 * the next option in the list.
 *
 * First option is chosen if
 * there is no next option.
 *
 * @public
 */
Setting.prototype.next = function() {
  var options = this.get('options');
  var selected = this.selected();
  var index = options.indexOf(selected);
  var newIndex = (index + 1) % options.length;
  this.select(newIndex);
  debug('set \'%s\' to index: %s', this.key, newIndex);
};

// /**
//  * Get the value of the currently
//  * selected option.
//  *
//  * @return {*}
//  * @public
//  */
// Setting.prototype.value = function() {
//   var selected = this.selected();
//   return selected && (selected.value || selected.key);
// };

/**
 * Persists the current selection
 * to storage for retreval in the
 * next session.
 *
 * @public
 */
Setting.prototype.save = function() {
  var selected = this.get('selected');
  debug('saving key: %s, selected: %s', this.key, selected);
  storage.setItem('setting_' + this.key, selected, Infinity);
  debug('saved key: %s, value: %s', this.key, selected);
};

/**
 * Fetches the persisted selection
 * from storage, updating the
 * `selected` key.
 *
 * Leaving in the `done` callback in-case
 * storage goes async again in future.
 *
 * @param  {Function} done
 * @public
 */
Setting.prototype.fetch = function() {
  if (!this.get('persistent')) { return; }
  debug('fetch value key: %s', this.key);
  this.fetched = storage.getItem('setting_' + this.key);
  debug('fetched %s value: %s', this.key, this.fetched);
  if (this.fetched) { this.select(this.fetched, { silent: true }); }
};

/**
 * Loops arrays or objects.
 *
 * @param  {Array|Object} obj
 * @param  {Function} fn
 */
function each(obj, fn) {
  if (Array.isArray(obj)) { obj.forEach(fn); }
  else { for (var key in obj) { fn(obj[key], key); } }
}

});
