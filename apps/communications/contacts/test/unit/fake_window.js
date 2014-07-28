'use strict';

(function(exports) {

  function FakeWindow(location) {
    this.parent = null;
    this.listeners = {};
    this.location = {
      toString: function() {
        return location;
      },
      get origin() {
        // Not a proper origin
        return location;
      }
    };
  }

  FakeWindow.prototype.addEventListener = function(type, cb) {

  };

  FakeWindow.prototype.removeEventListener = function(type, cb) {

  };

  FakeWindow.prototype.postMessage = function(message, host) {

  };

  exports.FakeWindow = FakeWindow;

})(window);
