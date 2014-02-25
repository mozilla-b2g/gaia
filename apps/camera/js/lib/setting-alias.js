define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var evt = require('vendor/evt');
var on = evt.prototype.on;

/**
 * Locals
 */

var forwardMethods = [
  'resetOptions',
  'selected',
  'value',
  'next'
];

/**
 * Exports
 */

module.exports = SettingAlias;

// Mixin emitter
evt(SettingAlias.prototype);

function SettingAlias(options) {
  mixin(this, options);
  this.map = this.map || {};
  this.get = this.get.bind(this);
  forwardMethods.forEach(this.forward, this);
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

SettingAlias.prototype.on = function(name, fn) {
  on.call(this, name, fn);
  for (var key in this.map) {
    var setting = this.settings[this.map[key]];
    var fire = this.firer(name);
    setting.on(name, fire);
  }
};

function mixin(a, b) {
  for (var key in b) { a[key] = b[key]; }
}

});
