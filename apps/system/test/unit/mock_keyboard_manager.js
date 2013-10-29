MockKeyboardManager = {
  mHeight: 0,
  init: function() {},
  getHeight: function() {
    return this.mHeight;
  },
  mTeardown: function() {
    this.mHeight = 0;
  },
  isOutOfProcessEnabled: false
};
