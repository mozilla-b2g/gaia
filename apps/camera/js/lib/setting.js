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
 * Locals
 */

var noop = function() {};

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
  this.select = this.select.bind(this);
}

Setting.prototype.configure = function(data) {
  data.optionsHashAll = this.optionsToHash(data.options);
  data.optionsHash = data.optionsHashAll;
  if (data.persistent) { this.on('change:selected', this.save); }
};

Setting.prototype.optionsToHash = function(options) {
  var hash = {};
  options.forEach(function(option, index) {
    var key = option.key;
    option.index = index;
    option.value = 'value' in option ? option.value : key;
    hash[key] = option;
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
  var selected = this.get('selected');
  var hash = this.get('optionsHash');
  var option = hash[selected];
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
  var hash = this.get('optionsHash');
  var list = this.get('options');
  var selected = isIndex ? list[key] : hash[key];

  // If there are no options, exit
  if (!list.length) { return; }

  // If an option was not found,
  // default to selecting the first.
  if (!selected) { return this.select(0); }

  // Store the new choice
  this.set('selected', selected.key, options);
};

/**
 * Add each matched option key to the
 * new options array.
 *
 * We make these updates silently so that
 * other parts of the app, can make alterations
 * to options before the UI is updated.
 *
 * @param  {Array} values
 */
Setting.prototype.configureOptions = function(values) {
  var optionsHashAll = this.get('optionsHashAll');
  var silent = { silent: true };
  var optionsHash = {};
  var options = [];

  each(values || [], function(value, key) {
    var valueIsObject = typeof value === 'object';
    var option;

    // Convert string values to objects
    // to make deriving the option key
    // a little simple in the next step.
    value = typeof value === 'string' ? { key: value } : value;

    // Keys can be derived in several ways:
    // 1. Array: [{ key: 'key1' }, { key: 'key2' }]
    // 2. Object: { key1: {}, key2: {} }
    key = value.key || key;
    option = optionsHashAll[key];

    // Skip if no matching
    // option is found.
    if (!option) { return; }

    // If the value is an object, we store it.
    // But as we accept options objects as values
    // we don't want to set the value of the option to itself
    if (valueIsObject && value !== option) {
      option.value = value;
    }

    optionsHash[key] = option;
    options.push(option);
  });

  options.sort(function(a, b) { return a.index - b.index; });

  // Store the revised options
  this.set('options', options, silent);
  this.set('optionsHash', optionsHash, silent);

  this.updateSelected(silent);
  debug('options configured for %s', this.key, options);
};

// NOTE: This could prove to be problematic as
// the selected option may be different to what
// was specified in the app config if the
// length of the list has changed.
//
// Solutions:
//
// 1. The key should be specified instead of an index,
//    but that doesn't give the option for
// 2. The order of the options could define preference,
//    although this could result in incorrectly ordered
//    options in the settings menu.
Setting.prototype.updateSelected = function(options) {
  this.select(this.get('selected') || 0, options);
};

/**
 * Set the `selected` option to
 * the next option in the list.
 *
 * First option is chosen if
 * there is no next option.
 */
Setting.prototype.next = function() {
  var list = this.get('options');
  var selected = this.selected();
  var index = list.indexOf(selected);
  var newIndex = (index + 1) % list.length;
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
  return this.selected('value');
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
Setting.prototype.fetch = function(done) {
  done = done || noop;
  if (!this.get('persistent')) { return done(); }
  debug('fetch value key: %s', this.key);
  var value = localStorage.getItem('setting:' + this.key);
  debug('fetched %s value: %s', this.key, value);
  if (value) { this.select(value, { silent: true }); }
  done();
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