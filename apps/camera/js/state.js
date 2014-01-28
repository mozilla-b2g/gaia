define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var model = require('vendor/model');
var storage = require('asyncStorage');
var config = require('config/app');
var bindAll = require('utils/bindAll');
var debug = require('debug')('state');

/**
 * Exports
 */

module.exports = State;

/**
 * Locals
 */

var storageKey = 'camera_state';
var has = {}.hasOwnProperty;
var noop = function() {};

// Mixin model methods
model(State.prototype);

/**
 * Initialize a new `State`.
 *
 * @constructor
 */
function State() {
  bindAll(this);
  this.key = storageKey;
  this.persist = {};
  var defaults = this.configDefaults(config);
  this.reset(defaults, { silent: true });
  this.on('change', this.onChange);
  debug('initialized with', defaults);
}

/**
 * Fetch the state object
 * held in storage.
 *
 * @param  {Function} done
 */
State.prototype.fetch = function(done) {
  var self = this;
  storage.getItem(this.key, function(props) {
    self.set(props, { silent: true });
    debug('fetched', props);
    if (done) done();
  });
};

/**
 * Persist the model to storage.
 *
 * Excluding keys marked as,
 * `persist: false` in config json.
 *
 * @param  {Function} done
 * @return {State} for chaining
 */
State.prototype.save = function(done) {
  debug('saving');
  var data = this.getPersistent();
  storage.setItem(this.key, data, done || noop);
  return this;
};

/**
 * Get a new object containing
 * just the persistent keys
 * from the model.
 *
 * @return {Object}
 * @private
 */
State.prototype.getPersistent = function() {
  var json = this.get();
  var result = {};
  for (var key in json) {
    if (this.persist[key]) { result[key] = json[key]; }
  }
  debug('got persistent keys', result);
  return result;
};

/**
 * Saves state model to persist
 * storage. Debounced by 2secs.
 *
 * @private
 */
State.prototype.onChange = function(keys) {
  debug('changed', keys);
  clearTimeout(this.saveTimeout);
  this.saveTimeout = setTimeout(this.save, 2000);
};

/**
 * Extracts the default state
 * from our app config in the form
 * of a flat key/value object.
 *
 * We also track whether the key
 * should be persisted to storage
 * so that when we come to save
 * we can filter the model down.
 *
 * @param  {Object} config
 * @return {Object}
 */
State.prototype.configDefaults = function(config) {
  var result = {};
  var item;

  for (var key in config) {
    item = config[key];

    // Remember whether this key should be
    // persisted or not (defaults to true).
    this.persist[key] = item.persist !== false;

    // Store only if default key given
    if (has.call(item, 'default')) {
      result[key] = item['default'];
    }
  }

  debug('persist keys', this.persist);
  debug('defaults', result);
  return result;
};

// Might be needed in future
// function deepMix(a, b) {
//   var obj = 'object';

//   // Don't attempt to mix arrays
//   if (Array.isArray(b)) { return b; }

//   // If the key is an 'object' on both
//   // 'a' and 'b', deep mix the two objects
//   for (var key in b) {
//     if (b.hasOwnProperty(key)) {
//       a[key] = (typeof a[key] === obj && typeof b[key] === obj) ?
//         deepMix(a[key], b[key]) : b[key];
//     }
//   }

//   return a;
// }

});
