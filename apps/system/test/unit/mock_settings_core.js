'use strict';

(function(exports) {
  var MockSettingsCore = function() {};
  MockSettingsCore.prototype = {
    name: 'SettingsCore',
    get: function(name) {},
    set: function() {},
    addObserver: function() {},
    removeObserver: function() {},
    start: function() {
    },
    stop: function() {
    }
  };
  exports.MockSettingsCore = MockSettingsCore;
}(window));