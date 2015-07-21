(function(exports) {
  'use strict';

  var MockSpatialNavigator = function MockSpatialNavigator() {};

  MockSpatialNavigator.prototype = {
    on: function() {},
    add: function() {},
    remove: function() {},
    init: function() {},
    focus: function() {},
    getFocusedElement: function() {
      return this.m_focusedElement;
    },

    m_focusedElement: null
  };

  exports.MockSpatialNavigator = MockSpatialNavigator;
}(window));
