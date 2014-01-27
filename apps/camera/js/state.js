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

var defaultState = getDefaultState(config.settings.keys);
var storageKey = 'camera_state';
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
  this.reset(defaultState, { silent: true });
  this.on('change', this.onChange);
  debug('initialized with', defaultState);
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
    (done || noop)();
  });
};

/**
 * Persist the model to storage.
 *
 * @param  {Function} done
 * @return {State} for chaining
 */
State.prototype.save = function(done) {
  debug('saving');
  storage.setItem(this.key, this.get(), done || noop);
  return this;
};

/**
 * Saves state model to persistant
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
 * @param  {Object} config
 * @return {Object}
 */
function getDefaultState(keys) {
  var result = {};
  for (var key in keys) {
    result[key] = keys[key]['default'];
  }
  return result;
}

// Might be needed in future
function deepMix(a, b) {
  var obj = 'object';

  // Don't attempt to mix arrays
  if (Array.isArray(b)) { return b; }

  // If the key is an 'object' on both
  // 'a' and 'b', deep mix the two objects
  for (var key in b) {
    if (b.hasOwnProperty(key)) {
      a[key] = (typeof a[key] === obj && typeof b[key] === obj) ?
        deepMix(a[key], b[key]) : b[key];
    }
  }

  return a;
}

});
