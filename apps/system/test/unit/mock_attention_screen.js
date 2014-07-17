var MockAttentionScreen = {
  attentionScreen: document.createElement('div'),
  statusHeight: 0,
  open: function() {},
  show: function() {},
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
  },
  maximize: function() {}
};
