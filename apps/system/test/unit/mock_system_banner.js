var MockSystemBanner = {
  show: function(message) {
    this.mShowCount++;
    this.mMessage = message;
  },

  mShowCount: 0,
  mMessage: null,
  mTeardown: function teardown() {
    this.mShowCount = 0;
    this.mMessage = null;
  }
};
