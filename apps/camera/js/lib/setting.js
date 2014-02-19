define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('setting');
var model = require('vendor/model');
var mixin = require('lib/mixin');

/**
 * Exports
 */

module.exports = Setting;

// Mixin Model methods
model(Setting.prototype);

/**
 * Initialize a new `Setting` model.
 *
 * @param {Object} data
 */
function Setting(data) {
  this.key = data.key;
  this.configure(data);
  this.reset(data, { silent: true });
  this.updateSelected({ silent: true });
  this.anyOptions = data.options.length === 0;
  this.isValidOption = this.isValidOption.bind(this);
  this.inflateOption = this.inflateOption.bind(this);
  this.select = this.select.bind(this);
  this.next = this.next.bind(this);
}

Setting.prototype.configure = function(data) {
  this._options = {};
  this._options.config = this.optionsToHash(data.options);
  this._options.hash = this._options.config;
  this.on('change:options', this.onOptionsChange);
  if (data.persistent) { this.on('change:selected', this.save); }
};

Setting.prototype.onOptionsChange = function() {
  this.resetOptionsHash();
  this.sortOptions();
  this.updateSelected();
  debug('options changed');
};

Setting.prototype.optionsToHash = function(options) {
  var hash = {};

  options.forEach(function(option, index) {
    var key = option.key;
    option.index = index;
    hash[key] = option;
  });

  return options.length && hash;
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

Setting.prototype.resetOptions = function(options) {
  options = this.format(options || [])
    .filter(this.isValidOption)
    .map(this.inflateOption);

  this.set('options', options);
  this.emit('optionsreset', options);
};

Setting.prototype.sortOptions = function() {
  var options = this.get('options');
  options.sort(function(a, b) { return a.index - b.index; });
};

Setting.prototype.resetOptionsHash = function() {
  var options = this.get('options');
  var hash = this._options.hash = {};
  options.forEach(function(option) { hash[option.key] = option; });
};

Setting.prototype.updateSelected = function() {
  this.select(this.get('selected') || this.fetched, { silent: true });
};

// Override this for custom options formatting
Setting.prototype.format = function(options) {
  var isArray = Array.isArray(options);
  var normalized = [];

  each(options, function(value, key) {
    var option = {};
    option.key = isArray ? (value.key || value) : key;
    option.value = value.value || value;
    normalized.push(option);
  });

  return normalized;
};

Setting.prototype.isValidOption = function(option) {
  return !!(this._options.config[option.key] || !this._options.config);
};

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
 */
Setting.prototype.next = function() {
  var options = this.get('options');
  var selected = this.selected();
  var index = options.indexOf(selected);
  var newIndex = (index + 1) % options.length;
  this.select(newIndex);
  debug('set \'%s\' to index: %s', this.key, newIndex);
};

/**
 * Get the value of the currently
 * selected option.
 *
 * @return {*}
 */
Setting.prototype.value = function() {
  var selected = this.selected();
  return selected.value || selected.key;
};

/**
 * Persists the current selection
 * to storage for retreval in the
 * next session.
 *
 * We're using localStorage as performance
 * vastly outweighed indexedBD (asyncStorage)
 * by 1ms/500ms on Hamachi device.
 *
 * @public
 */
Setting.prototype.save = function() {
  var selected = this.get('selected');
  debug('saving key: %s, selected: %s', this.key, selected);
  localStorage.setItem('setting:' + this.key, selected);
  debug('saved key: %s', selected);
};

/**
 * Fetches the persisted selection
 * from storage, updating the
 * `selected` key.
 *
 * We're using localStorage, as performance
 * vastly outweighed indexedBD (asyncStorage)
 * by 1ms/500ms on Hamachi device.
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
  this.fetched = localStorage.getItem('setting:' + this.key);
  debug('fetched %s value: %s', this.key, this.fetched);
  if (this.fetched) { this.select(this.fetched, { silent: true }); }
};

/**
 * Loops arrays or objects.
 *
 * @param  {Array|Object}   obj
 * @param  {Function} fn
 */
function each(obj, fn) {
  if (Array.isArray(obj)) { obj.forEach(fn); }
  else { for (var key in obj) { fn(obj[key], key, true); } }
}

});
