'use strict';

(function(exports) {
  var MockInputWindow = function(configs) {
    // for test purposes, let's remember the configs
    // such we can compare them with known values
    this._storedConfigs = configs;

    this.height = undefined;

    return this;
  };

  MockInputWindow.prototype = {
    start: function miw_start() {
    },

    stop: function miw_stop() {
    },

    open: function miw_open() {
    },

    close: function miw_close() {
    },

    _setAsActiveInput: function miw_setAsActiveInput() {
    },

    destroy: function miw_destroy() {
    }
  };

  exports.MockInputWindow = MockInputWindow;
}(window));
