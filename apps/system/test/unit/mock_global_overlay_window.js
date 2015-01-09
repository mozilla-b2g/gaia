/* global MockAppWindow */
'use strict';
/**
 * @requires MockAppWindow
 */

(function(exports) {
  var MockGlobalOverlayWindow = function(configs) {
    MockAppWindow.call(this, configs);
  };
  MockGlobalOverlayWindow.prototype =
    Object.create(window.MockAppWindow.prototype);
  MockGlobalOverlayWindow.prototype.prefix = 'mock-globaloverlay-';
  MockGlobalOverlayWindow.mTeardown = function() {};
  exports.MockGlobalOverlayWindow = MockGlobalOverlayWindow;
}(window));
