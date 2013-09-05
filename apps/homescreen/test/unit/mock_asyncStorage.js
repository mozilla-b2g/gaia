'use strict';

var MockasyncStorage = {
  keys: {},

  getItem: function(key, cb) {
    if (!cb) {
      return;
    }

    cb(this.keys[key]);
  },

  setItem: function(key, value, cb) {
    this.keys[key] = value;
    cb && cb();
  },

  removeItem: function(key) {
    delete this.keys[key];
  },

  clear: function(key) {
    this.keys = {};
  }
};
