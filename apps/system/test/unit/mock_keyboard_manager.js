MockKeyboardManager = {
  mHeight: 0,
  init: function() {},
  removeKeyboard: function() {},
  hideKeyboard: function() {},
  getHeight: function() {
    return this.mHeight;
  },
  mTeardown: function() {
    this.mHeight = 0;
  },
  _onKeyboardReady: function() {},
  inputTypeTable: {},
  isOutOfProcessEnabled: false,
  totalMemory: 0
};
