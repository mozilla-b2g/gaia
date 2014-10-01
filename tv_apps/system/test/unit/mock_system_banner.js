'use strict';
/* exported MockSystemBanner */

var MockSystemBanner = function() {};

MockSystemBanner.prototype = {
  show: function(message) {
    MockSystemBanner.mShowCount++;
    MockSystemBanner.mMessage = message;
  }
};

MockSystemBanner.mShowCount = 0;
MockSystemBanner.mMessage = null;
MockSystemBanner.mTeardown = function() {
  this.mShowCount = 0;
  this.mMessage = null;
};
