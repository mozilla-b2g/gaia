'use strict';
/**
 * @requires MockAppWindow
 */

(function(exports) {
  var MockCallscreenWindow = function() {
  };
  MockCallscreenWindow.prototype =
    Object.create(window.MockAttentionWindow.prototype);
  MockCallscreenWindow.prototype.prefix = 'mock-callscreen-';
  MockCallscreenWindow.prototype.hasAttentionPermission = function() {};
  MockCallscreenWindow.prototype.free = function() {};
  MockCallscreenWindow.prototype.ensure = function() {};
  MockCallscreenWindow.mTeardown = function() {};
  exports.MockCallscreenWindow = MockCallscreenWindow;
}(window));
