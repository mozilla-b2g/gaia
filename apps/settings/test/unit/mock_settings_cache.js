/* global define */
define(function() {
  'use strict';
  var _settings = {};

  var ctor = {
    getSettings: function(callback) {
      callback(_settings);
    },

    // custom settings
    mockSettings: function(value) {
      _settings = value;
    },

    mTeardown: function() {
      _settings = {};
    }
  };

  return ctor;
});
