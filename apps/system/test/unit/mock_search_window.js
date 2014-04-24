'use strict';
/**
 * @requires MockAppWindow
 */

(function(exports) {
  var MockSearchWindow = function() {
  };
  MockSearchWindow.prototype.__proto__ = window.MockAppWindow.prototype;
  MockSearchWindow.mTeardown = function() {};
  exports.MockSearchWindow = MockSearchWindow;
}(window));
