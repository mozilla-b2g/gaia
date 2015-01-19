'use strict';
(function(exports) {
  function MockInputWindowManager() {
    this.mHeight = 0;
  }

  MockInputWindowManager.prototype = {
    getHeight: function() {
      return this.mHeight;
    },
    start: function() {},
    getLoadedManifestURLs: function() {
      return [];
    },
    _onInputLayoutsRemoved: function() {},
    showInputWindow: function() {},
    hideInputWindow: function() {},
    preloadInputWindow: function() {}
  };

  exports.MockInputWindowManager = MockInputWindowManager;
}(window));