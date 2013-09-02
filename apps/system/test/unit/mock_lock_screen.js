'use strict';

var MockLockScreen = {
  locked: false,

  init: function mls_init() {
    this.locked = false;
  },

  lock: function mls_lock() {
    this.locked = true;
  },

  unlock: function mls_unclock() {
    this.locked = false;
  },

  mTeardown: function mls_mTeardown() {
    this.init();
  }
};
