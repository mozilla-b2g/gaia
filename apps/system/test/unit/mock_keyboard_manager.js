MockKeyboardManager = {
  mHeight: 0,
  init: function() {},
  hideKeyboard: function() {},
  getHeight: function() {
    return this.mHeight;
  },
  mTeardown: function() {
    this.mHeight = 0;
  },
  inputTypeTable: {},
  isOutOfProcessEnabled: false,
  totalMemory: 0,
  keyboardFrameContainer: null,
  resizeKeyboard: function() {},
  setHasActiveKeyboard: function() {}
};
