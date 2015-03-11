'use strict';
/**
 * READONLY Bluetooth profile identifier list.
 */
(function(exports) {
  var BluetoothProfiles = {
    // Hands-Free Profile
    get HFP() {
      return 'hfp';
    },

    // Object Push Profile
    get OPP() {
      return 'opp';
    },

    // Advenced Audio Distribution Profile
    get A2DP() {
      return 'a2dp';
    },

    // Synchronous Connection-Oriented
    get SCO() {
      return 'sco';
    }
  };

  exports.BluetoothProfiles = BluetoothProfiles;
})(window);
