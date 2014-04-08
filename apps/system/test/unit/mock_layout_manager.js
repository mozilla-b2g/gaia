'use strict';

(function(exports) {
  var MockLayoutManager = function MockLayoutManager() {};
  MockLayoutManager.prototype = {
    width: window.innerWidth,
    height: window.innerHeight,
    keyboardEnabled: false,
    match: function() {
      return true;
    },
    start: function() {
      return this;
    },
    mTeardown: function mlm_mTeardown() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.keyboardEnabled = false;
    }
  };
  exports.MockLayoutManager = MockLayoutManager;
}(window));
