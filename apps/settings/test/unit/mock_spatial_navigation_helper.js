/* global define */
define(function() {
  'use strict';

  var MockSpatialNavigationHelper = {
    _enabled: true,
    init: function() {
      return Promise.resolve();
    },
    add: function() {},
    remove: function() {},
    focus: function() {},
    makeFocusable: function() {},
    isEnabled: function() {
      return this._enabled;
    },
    getFocusedElement: function() {
      return this.m_focusedElement;
    },

    m_focusedElement: null
  };

  return MockSpatialNavigationHelper;
});
