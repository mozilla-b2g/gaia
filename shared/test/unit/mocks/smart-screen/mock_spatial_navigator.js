(function(exports) {
  'use strict';

  function MockSpatialNavigator() {
    this.on = function() {};
    this.add = function() {};
    this.remove = function() {};
    this.getFocusedElement = function() {};
  }

  exports.MockSpatialNavigator = MockSpatialNavigator;
}(window));
