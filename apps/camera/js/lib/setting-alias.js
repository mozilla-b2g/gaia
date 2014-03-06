define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var evt = require('vendor/evt');

/**
 * Locals
 */

var off = evt.prototype.off;
var on = evt.prototype.on;
var forwardMethods = [
  'resetOptions',
  'selected',
  'next',
  'set'
];

/**
 * Exports
 */

module.exports = SettingAlias;

// Mixin emitter
evt(SettingAlias.prototype);

/**
 * Initialize a new `SettingsAlias`
 *
 * @param {Object} options
 */
function SettingAlias(options) {
  this.settings = options.settings;
  this.key = options.key;
  this.map = options.map || {};
  this.get = this.setting = options.get.bind(this);
  this.get = this.setting = this.get.bind(this);
  forwardMethods.forEach(this.forward, this);
  this.propagate = this.propagator();
}

/**
 * Attaches a method that forwards
 * the call onto the current
 * matching setting.
 *
 * @param  {String} method
 */
SettingAlias.prototype.forward = function(method) {
  this[method] = function() {
    var setting = this.get();
    return setting[method].apply(setting, arguments);
  };
};

/**
 * Attach a pseudo callback that
 * fires when the same event fires
 * on the currently active setting.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
SettingAlias.prototype.on = function(name, fn) {
  on.call(this, name, fn);
  for (var key in this.map) {
    var setting = this.settings[this.map[key]];
    setting.on(name, this.propagate);
  }
};

/**
 * Remove pseudo callback.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
SettingAlias.prototype.off = function(name, fn) {
  off.call(this, name, fn);
  for (var key in this.map) {
    var setting = this.settings[this.map[key]];
    setting.off(name, this.propagate);
  }
};

/**
 * Returns a function that when
 * attached as a callback to
 * another event handler, will
 * fire the same event on itself.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
SettingAlias.prototype.propagator = function() {
  var alias = this;
  return function() {
    if (this.key === alias.get().key) {
      alias.fire.apply(alias, this.fireArgs);
    }
  };
};

});
