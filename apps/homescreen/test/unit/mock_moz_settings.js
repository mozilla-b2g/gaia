'use strict';

var realMozSettings = navigator.mozSettings;

navigator.mozSettings = {
  createLock: function() {
    return {
      set: function(result) {
        navigator.mozSettings.result = result;
      }
    };
  },

  teardown: function() {
    navigator.mozSettings.result = null;
  },

  suiteTeardown: function() {
    navigator.mozSettings = realMozSettings;
  }
};
