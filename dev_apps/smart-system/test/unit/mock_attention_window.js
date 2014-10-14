/* global MockAppWindow */
'use strict';
/**
 * @requires MockAppWindow
 */

(function(exports) {
  var MockAttentionWindow = function(configs) {
    MockAppWindow.call(this, configs);
  };
  MockAttentionWindow.prototype = Object.create(window.MockAppWindow.prototype);
  MockAttentionWindow.prototype.prefix = 'mock-attention-';
  MockAttentionWindow.prototype.promote = function() {};
  MockAttentionWindow.prototype.demote = function() {};
  MockAttentionWindow.prototype.makeNotification = function() {};
  MockAttentionWindow.mTeardown = function() {};
  exports.MockAttentionWindow = MockAttentionWindow;
}(window));
