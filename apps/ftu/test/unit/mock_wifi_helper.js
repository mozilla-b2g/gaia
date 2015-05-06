'use strict';
/* global MockNavigatorMozWifiManager */
/* exported MockWifiHelper */

require('/shared/test/unit/mock_navigator_moz_wifi_manager.js');

var MockWifiHelper = {
  setPassword: function(pswd) {},
  getWifiManager: function() {
    return MockNavigatorMozWifiManager;
  },
  getSecurity: function(network) {
    return network.security;
  },
  isConnected: function(network) {
    return false;
  },
  isOpen: function(network) {
    return false;
  },
  isEap: function(network) {
    return false;
  }
};
