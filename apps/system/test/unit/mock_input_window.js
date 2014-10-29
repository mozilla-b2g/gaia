'use strict';

(function(exports) {
  var MockInputWindow = function(configs) {
    // for test purposes, let's remember the configs
    // such we can compare them with known values
    this._storedConfigs = configs;

    return this;
  };

  MockInputWindow.prototype = {
    start: function mifm_start() {
    },

    stop: function mifm_stop() {
    }
  };

  exports.MockInputWindow = MockInputWindow;
}(window));
