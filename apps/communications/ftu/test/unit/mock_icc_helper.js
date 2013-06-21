'use strict';

var MockIccHelper = {
  mSetup: function icch_mSetup() {},

  mTeardown: function icch_mTeardown() {},

  addEventListener: function icch_addEventListener(event, handler) {},

  get enabled() {
    return true;
  },

  unlockCardLock: function() {
    var settingsRequest = {
      result: {},
      set onsuccess(callback) {
        callback.call(this);
      },
      set onerror(callback) {}
    };
    return settingsRequest;
  }
};
