var MockAttentionScreen = {
  mVisible: false,
  mFullyVisible: false,
  isVisible: function() {
    return this.mVisible;
  },
  isFullyVisible: function() {
    return this.mFullyVisible;
  },
  mTeardown: function() {
    this.mVisible = false;
    this.mFullyVisible = false;
  }
};
