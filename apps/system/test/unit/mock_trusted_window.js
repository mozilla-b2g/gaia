'use strict';
(function(exports) {

  var MockTrustedWindow = function TrustedWindow(config) {
    this.open = function() {};
    this.element = document.createElement('div');
    this.browser = {
      element: document.createElement('iframe')
    };
  };
  exports.MockTrustedWindow = MockTrustedWindow;
}(window));
