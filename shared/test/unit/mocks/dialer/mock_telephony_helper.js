'use strict';

/* exported MockTelephonyHelper */

var MockTelephonyHelper = {
  mInUseSim: null,
  call: function() {},
  getInUseSim: function() { return this.mInUseSim; },
  mTeardown: function() { this.mInUseSim = null; }
};
