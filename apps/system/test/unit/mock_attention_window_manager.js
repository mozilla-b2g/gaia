'use strict';
(function(exports) {
  var MockAttentionWindowManager = {
    mVisible: false,
    mFullyVisible: false,
    mBarHeight: 40,
    hasAliveWindow: function() {
      return this.mVisible;
    },
    hasActiveWindow: function() {
      return this.mFullyVisible;
    },
    isAtBarMode: function() {
      return (this.mVisible && !this.mFullyVisible);
    },
    barHeight: function() {
      return this.mBarHeight;
    },
    mTeardown: function() {
      this.mVisible = false;
      this.mFullyVisible = false;
      this.mBarHeight = 40;
    }
  };
  exports.MockAttentionWindowManager = MockAttentionWindowManager;
}(window));

