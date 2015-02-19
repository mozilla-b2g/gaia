(function(exports) {
  'use strict';

  var MockIACHandler = {
    _portMap: {},

    reset: function() {
      this._portMap = {};
    },

    getPort: function(name) {
      return this._portMap[name];
    }
  };

  exports.MockIACHandler = MockIACHandler;
}(window));
