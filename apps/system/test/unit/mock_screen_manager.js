/* exported MockScreenManager */

'use strict';

(function(exports) {
  var MockScreenManager = {
    mSetup: function() {
      this.mScreenEnabled = true;
    },

    turnScreenOn: function() {
      this.mScreenEnabled = true;
    },

    turnScreenOff: function() {
      this.mScreenEnabled = false;
    },

    get screenEnabled() {
      return this.mScreenEnabled;
    },

    set screenEnabled(value) {
      this.mScreenEnabled = value;
    }
  };
  exports.MockScreenManager = MockScreenManager;
})(window);
