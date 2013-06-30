'use strict';

var MockIccHelper = {
  mSetup: function icch_mSetup() {},

  mTeardown: function icch_mTeardown() {},

  addEventListener: function icch_addEventListener(event, handler) {},

  get enabled() {
    return true;
  },

  get cardState() {
    return 'ready';
  }
};
