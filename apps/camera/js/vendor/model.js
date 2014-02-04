define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var events = require('vendor/evt');

/**
 * Exports
 */

module.exports = Model;

function Model(obj) {
  if (!(this instanceof Model)) { return mix(obj, Model.prototype); }
  this.reset(obj, { silent: true });
  this.id = obj.id || obj.key;
}

Model.prototype = events({
  get: function(key) {
    var data = this._getData();
    return key ? data[key] : mix({}, data);
  },

  set: function(key, value, options) {
    options = typeof key === 'object' ? value : options;
    var silent = options && options.silent;
    var data = this._getData();
    var keys;

    switch (typeof key) {
      case 'string':
        data[key] = value;
        if (!silent) {
          this.onKeyChange(key);
          this.emit('change', [key]);
        }
        return;
      case 'object':
        mix(data, key);
        if (!silent) {
          keys = Object.keys(key);
          keys.forEach(this.onKeyChange, this);
          this.emit('change', keys);
        }
        return;
    }
  },

  setter: function(key) {
    return (function(value) { this.set(key, value); }).bind(this);
  },

  reset: function(data, options) {
    if (!data) { return; }
    var silent = options && options.silent;
    var isArray = data instanceof Array;
    this._data = !isArray ? mix({}, data) : data;
    if (!silent) { this.emit('reset'); }
  },

  onKeyChange: function(key) {
    var data = this._getData();
    this.emit('change:' + key, data[key]);
  },

  _getData: function() {
    this._data = this._data || {};
    return this._data;
  }
});

function mix(a, b) {
  for (var key in b) { a[key] = b[key]; }
  return a;
}

});
