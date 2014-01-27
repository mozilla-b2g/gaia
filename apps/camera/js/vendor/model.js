define(function(require, exports, module) {
'use strict';

var evt = require('vendor/evt');

module.exports = Model;

function Model(obj) {
  if (!(this instanceof Model)) { return mix(obj, Model.prototype); }
  this._data = this.reset(obj, { silent: true });
}

Model.prototype = evt.mix({
  get: function(key) {
    var data = this._getData();
    return key ? data[key] : data;
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

  reset: function(data, options) {
    if (!data) { return; }
    var silent = options && options.silent;
    this._data = mix({}, data);
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
