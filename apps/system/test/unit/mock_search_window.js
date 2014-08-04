'use strict';
/**
 * @requires MockAppWindow
 */

(function(exports) {
  var MockSearchWindow = function() {
  };
  MockSearchWindow.prototype = Object.create(window.MockAppWindow.prototype);
  MockSearchWindow.mTeardown = function() {};
  exports.MockSearchWindow = MockSearchWindow;
}(window));
