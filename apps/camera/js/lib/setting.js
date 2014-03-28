define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('setting');
var model = require('vendor/model');

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
  this.storage = data.storage || localStorage;
  this.reset(data, { silent: true });
  this.select = this.select.bind(this);
  this.next = this.next.bind(this);
  this.configure(data);
  if (data.persistent) { this.on('change:selected', this.save); }
}

Setting.prototype.configure = function(data) {
  var optionsDefined = !!(data.options && data.options.length);
  this.options = { defined: optionsDefined };
  this.resetOptions(data.options);
};

Setting.prototype.resetOptions = function(list) {
  list = list || [];

  var hash = this.optionsToHash(list);
  this.options.all = hash;
  this.options.available = hash;

  this.set('options', list, { silent: true });
  this.updateSelected({ silent: true });
};

Setting.prototype.filterOptions = function(keys) {
  var available = this.options.available = {};
  var hash = this.options.all;
  var filtered = [];

  (keys || []).forEach(function(key) {
    var option = hash[key];
    if (option !== undefined) {
      filtered.push(option);
      available[key] = option;
    }
  });

  this.sortByIndex(filtered);
  this.set('options', filtered, { silent: true });
  this.updateSelected({ silent: true });
};

/**
 * Convert this Setting's `options` array as defined
 * in config/app.js into an object as key/value pairs.
 * This allows us to look up an option by its `key`.
 *
 * e.g.: [ { key: 'a', title: 'A' }, ... ] ->
 *       { a: { key: 'a', title: 'A' }, ... }
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
  var hash = this.options.available;
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
  var available = this.options.available;
  var selected = isIndex ? list[key] : available[key];

  // If there are no options, exit
  if (!list.length) { return; }

  // If an option was not found,
  // default to selecting the first.
  if (!selected) { return this.select(0, options); }

  // Store the new choice
  this.set('selected', selected.key, options);
};

/**
 * Sorts the current options list
 * by their originally defined
 * index in the config JSON.
 *
 * @private
 */
Setting.prototype.sortByIndex = function(list) {
  return list.sort(function(a, b) { return a.index - b.index; });
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
  this.storage.setItem('setting:' + this.key, selected);
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
  this.fetched = this.storage.getItem('setting:' + this.key);
  debug('fetched %s value: %s', this.key, this.fetched);
  if (this.fetched) { this.select(this.fetched, { silent: true }); }
};

/**
 * States whether this setting
 * is currently supported.
 *
 * 'Supported' means, it's not been
 * disabled, and there are options
 * to be chosen from.
 *
 * @return {Boolean}
 */
Setting.prototype.supported = function() {
  return this.enabled() && !!this.get('options').length;
};


/**
 * Check if this setting is not
 * marked as disabled.
 *
 * @return {Boolean}
 */
Setting.prototype.enabled = function() {
  return !this.get('disabled');
};

});
