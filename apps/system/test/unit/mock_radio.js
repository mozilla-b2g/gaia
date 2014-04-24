/* exported MockRadio */
'use strict';

var MockRadio = {
  _enabled: false,
  _events: {},
  set enabled(value) {
    this._enabled = value;
  },
  get enabled() {
    return this._enabled;
  },
  addEventListener: function(key, callback) {
    if (!this._events[key]) {
      this._events[key] = [];
    }
    this._events[key].push(callback);
  },
  mTeardown: function() {
    this._enabled = false;
    this._events = {};
  }
};
