var MockAttentionScreen = {
  mVisible: false,
  mFullyVisible: false,
  isVisible: function() {
    return this.mVisible;
  },
  isFullyVisible: function() {
    return this.mFullyVisible;
  },
  getAttentionScreenOrigins: function() {
    return [];
  },
  mTeardown: function() {
    this.mVisible = false;
    this.mFullyVisible = false;
  }
};
