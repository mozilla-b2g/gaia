(function(define){define(function(require,exports,module){
'use strict';

/**
 * Dependencies
 */

var events = require('evt');

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

  /**
   * Returns the value of the given
   * key, or if not key is given a
   * shallow clone of the model is
   * returned.
   *
   * We check `aguments.length` so that
   * when calling `get()` with an unknown
   * key, `undefined` is returned and not
   * the entire model.
   *
   * Example:
   *
   *   model.get(); //=> { ... }
   *   model.get('undefinedKey'); //=> undefined
   *
   * @param  {String} key
   * @return {*}
   * @public
   */
  get: function(key) {
    var data = this._getData();
    return arguments.length ? data[key] : mix({}, data);
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

  setter: function(key, value1) {
    return (function(value2) { this.set(key, value1 || value2); }).bind(this);
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

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('model',this));
