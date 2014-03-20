'use strict';

(function(exports) {
  var MockLayoutManager = function MockLayoutManager() {};
  MockLayoutManager.prototype = {
    width: window.innerWidth,
    fullscreenHeight: window.innerHeight,
    usualHeight: window.innerHeight,
    keyboardEnabled: false,
    match: function() {
      return true;
    },
    start: function() {
      return this;
    },
    mTeardown: function mlm_mTeardown() {
      this.width = window.innerWidth;
      this.fullscreenHeight = window.innerHeight;
      this.usualHeight = window.innerHeight;
      this.keyboardEnabled = false;
    }
  };
  exports.MockLayoutManager = MockLayoutManager;
}(window));
