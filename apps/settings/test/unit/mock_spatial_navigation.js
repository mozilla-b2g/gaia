/* global define */
define(function() {
  'use strict';

  var MockSpatialNavigation = {
    on: function() {},
    add: function() {},
    remove: function() {},
    init: function() {},
    focus: function() {},
    makeFocusable: function() {},
    getFocusedElement: function() {
      return this.m_focusedElement;
    },

    m_focusedElement: null
  };

  return MockSpatialNavigation;
});
