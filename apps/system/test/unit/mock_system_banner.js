var MockSystemBanner = {
  show: function(message) {
    this.mShowCount++;
    this.mMessage = message;
  },

  mShowCount: 0,
  mMessage: null,
  mTearDown: function tearDown() {
    this.mShowCount = 0;
    this.mMessage = null;
  }
};
