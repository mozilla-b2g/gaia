/* global MockEventTarget */
(function(exports) {
  'use strict';

  var MockSmartButton = function(iconType) {
    this.dataset = {
      iconType: iconType
    };
    this.classList = {
      add: function() {},
      remove: function() {}
    };
  };
  MockSmartButton.prototype = Object.create(MockEventTarget.prototype);

  exports.MockSmartButton = MockSmartButton;
}(window));
