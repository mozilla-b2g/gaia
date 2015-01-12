'use strict';

requireApp('ftu/test/unit/mock_navigator_moz_wifi_manager.js');

var MockWifiHelper = {
  getWifiManager: function() {
    return MockNavigatorMozWifiManager;
  },
  getSecurity: function(network) {
    return network.security;
  },
  isConnected: function(network) {
    return false;
  }
};
