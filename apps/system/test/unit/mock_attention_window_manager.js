'use strict';
(function(exports) {
  var MockAttentionWindowManager = {
    mVisible: false,
    mFullyVisible: false,
    mBarHeight: 40,
    mInstances: new Map(),
    hasAliveWindow: function() {
      return this.mVisible;
    },
    hasActiveWindow: function() {
      return this.mFullyVisible;
    },
    getInstances: function() {
      return this.mInstances;
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
      this.mInstances = new Map();
    }
  };
  exports.MockAttentionWindowManager = MockAttentionWindowManager;
}(window));

