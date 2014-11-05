/*exported MockasyncStorage */

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
    if (typeof cb === 'function') {
      cb();
    }
  },

  removeItem: function(key) {
    delete this.keys[key];
  },

  clear: function() {
    this.keys = {};
  },
  mSetup: function() {
    this.clear();
  },
  mTeardown: function() {
    this.clear();
  }
};
