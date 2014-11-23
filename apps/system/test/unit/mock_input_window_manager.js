'use strict';
(function(exports) {
  function MockInputWindowManager() {
    this.mHeight = 0;
  }

  MockInputWindowManager.prototype = {
    getHeight: function() {
      return this.mHeight;
    }
  };

  exports.MockInputWindowManager = MockInputWindowManager;
}(window));