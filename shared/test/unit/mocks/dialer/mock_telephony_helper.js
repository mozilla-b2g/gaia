'use strict';

/* exported MockTelephonyHelper */

var MockTelephonyHelper = {
  mInUseSim: null,
  mCallPromise: null,
  call: function() {
    if (!this.mCallPromise) {
      this.mCallPromise = new Promise(() => {});
    }

    return this.mCallPromise;
  },
  getInUseSim: function() { return this.mInUseSim; },
  mTeardown: function() {
    this.mInUseSim = null;
    this.mCallPromise = null;
  }
};
