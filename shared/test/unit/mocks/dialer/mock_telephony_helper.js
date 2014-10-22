console.time("mock_telephony_helper.js");
'use strict';

/* exported MockTelephonyHelper */

var MockTelephonyHelper = {
  mInUseSim: null,
  call: function() {},
  getInUseSim: function() { return this.mInUseSim; },
  mTeardown: function() { this.mInUseSim = null; }
};
console.timeEnd("mock_telephony_helper.js");
