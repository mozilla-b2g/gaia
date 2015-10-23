'use strict';
/* exported MockKeyboardManager */

var MockKeyboardManager = {
  mHeight: 0,
  init: function() {},
  mTeardown: function() {
    this.mHeight = 0;
  },
  _onKeyboardReady: function() {},
  _onKeyboardKilled: function() {},
  inputTypeTable: {}
};
