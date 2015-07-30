/* global MockAppWindow */
'use strict';
/**
 * @requires MockAppWindow
 */

(function(exports) {
  var MockPopupWindow = function(configs) {
    MockAppWindow.call(this, configs);
  };
  MockPopupWindow.prototype =
    Object.create(window.MockAppWindow.prototype);
  MockPopupWindow.prototype.prefix = 'mock-popup-';
  MockPopupWindow.prototype.CLASS_NAME = 'PopupWindow';
  MockPopupWindow.mTeardown = function() {};
  exports.MockPopupWindow = MockPopupWindow;
}(window));
