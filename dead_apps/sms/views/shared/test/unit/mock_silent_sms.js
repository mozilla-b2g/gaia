/* global Promise */
/* exported MockSilentSms */

'use strict';

var MockSilentSms = {
  mSilentSmsNumber: 9090,
  checkSilentModeFor: function (smsNumber) {
    return Promise.resolve(smsNumber === this.mSilentSmsNumber);
  },
  init: () => {},
  mSetup: function() {
    this.mSilentSmsNumber = 9090;
  },
  mTeardown: function() {
    this.mSilentSmsNumber = 9090;
  }
};
