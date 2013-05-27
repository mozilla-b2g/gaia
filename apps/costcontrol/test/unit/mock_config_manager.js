'use strict';

var MockConfigManager = function(config) {
  var fakeSettings = config.fakeSettings || {};

  return {
    option: function(key) {
      return fakeSettings[key];
    },
    requestSettings: function(callback) {
      callback(JSON.parse(JSON.stringify(fakeSettings)));
    },
    observe: function() {}
  };
};
