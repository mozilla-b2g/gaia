define(function(require, exports, module) {
'use strict';

var evt = require('vendor/evt');

module.exports = Model;

function Model(obj) {
  if (!(this instanceof Model)) { return mix(obj, Model.prototype); }
  this._data = obj;
}

Model.prototype = evt.mix({
  get: function(key) {
    var data = this._getData();
    return data[key];
  },

  set: function(key, value) {
    var data = this._getData();
    data[key] = value;
    this.emit('change:' + key, value);
    this.emit('change');
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
