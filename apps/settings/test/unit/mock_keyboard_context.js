/* global define */
define(function() {
  'use strict';

  var MockKeyboardContext = {
    mKeyboards: null,
    mEnabledLayouts: null,
    mTeardown: function() {
      this.mKeyboards = null;
      this.mEnabledLayouts = null;
    },
    init: function(callback) {
      callback();
    },
    keyboards: function(callback) {
      callback(this.mKeyboards);
    },
    enabledLayouts: function(callback) {
      callback(this.mEnabledLayouts);
    },
    defaultKeyboardEnabled: function(callback) {}
  };

  return MockKeyboardContext;
});
