'use strict';

var MockIccHelper = {
  mProps: {'cardState': null},

  setProperty: function _setProperty(property, newState) {
    this.mProps[property] = newState;
  },

  mSetup: function icch_mSetup() {},

  mTeardown: function icch_mTeardown() {},

  addEventListener: function icch_addEventListener(event, handler) {},

  get enabled() {
    return true;
  },

  get cardState() {
    return this.mProps['cardState'];
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
