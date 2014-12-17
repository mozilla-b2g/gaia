'use strict';

(function(exports) {
  var MockLayoutManager = function MockLayoutManager() {};
  MockLayoutManager.prototype = {
    width: window.innerWidth,
    height: window.innerHeight,
    mKeyboardHeight: 0,
    keyboardEnabled: false,
    match: function() {
      return true;
    },
    getHeightFor: function(win, ignoreKeyboard) {
      return this.height - (ignoreKeyboard ? 0 : this.mKeyboardHeight);
    },
    start: function() {
      return this;
    },
    mTeardown: function mlm_mTeardown() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.keyboardEnabled = false;
      this.mKeyboardHeight = 0;
    }
  };
  exports.MockLayoutManager = MockLayoutManager;
}(window));
