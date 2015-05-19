/* global MockEventTarget */
(function(exports) {
  'use strict';

  var MockMenuGroup = function() {};
  MockMenuGroup.prototype = Object.create(MockEventTarget.prototype);
  MockMenuGroup.prototype.changeIcon = function() {};
  MockMenuGroup.prototype.querySelectorAll = function() {};

  exports.MockMenuGroup = MockMenuGroup;
}(window));
