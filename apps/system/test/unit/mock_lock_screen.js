'use strict';

var MockLockScreen = {
  locked: false,

  enabled: true,

  passCodeEnabled: false,

  passcode: '0000',

  init: function mls_init() {
    this.locked = false;
  },

  lock: function mls_lock() {
    this.locked = true;
  },

  lockIfEnabled: function mls_lockIfEnabled() {
    if (this.enabled) {
      this.lock();
    }
  },

  unlock: function mls_unclock() {
    this.locked = false;
  },

  mozLockOrientation: function mls_mozLockOrientation() {
  },

  mTeardown: function mls_mTeardown() {
    this.init();
  }
};
