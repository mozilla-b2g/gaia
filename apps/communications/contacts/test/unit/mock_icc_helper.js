'use strict';

var MockIccHelper = {
  mSetup: function icch_mSetup() {},

  mTeardown: function icch_mTeardown() {},

  addEventListener: function icch_addEventListener(event, handler) {},

  get cardState() {
    return 'ready';
  }
};
