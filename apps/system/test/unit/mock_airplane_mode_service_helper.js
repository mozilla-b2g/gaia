'use strict';

(function(exports) {
  var MockAirplaneModeServiceHelper = function() {

  };
  MockAirplaneModeServiceHelper.prototype = {
    updateStatus: function(key) {
    },
    _settings: {},
    isEnabled: function(key) {
      for (var k in this._settings) {
        if (k.indexOf(key) >= 0) {
          return this._settings[k];
        }
      }
      return false;
    },
    isSuspended: function(key) {
      for (var k in this._settings) {
        if (k.indexOf(key) >= 0) {
          if (this._settings[k]) {
            return !this._settings[k];
          }
        }
      }
    }
  };
  exports.MockAirplaneModeServiceHelper = MockAirplaneModeServiceHelper;
}(window));
