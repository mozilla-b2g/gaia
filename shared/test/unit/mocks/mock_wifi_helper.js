/* exported MockWifiHelper */
/* global MockNavigatorMozWifiManager*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

var MockWifiHelper = {
  _cb: {
    onsuccess: [],
    onerror: []
  },
  getWifiManager: function() {
    return MockNavigatorMozWifiManager;
  },
  getSecurity: function(network) {
    return network.security;
  },
  setSecurity: function(network, encryptions) {
    network.security = encryptions;
  },
  newListItem: function(network, callback) {
    var li = document.createElement('li');
    li.onclick = function() {
      callback(network);
    };
    return li;
  },
  isConnected: function() {},
  getNetworkStatus: function() { return 'disconnected'; },
  isWpsAvailable: function() {},
  getAvailableAndKnownNetworks: function() {
    var self = this;
    return {
      result: [
        { ssid: 'ssid1', security: ['WPA-PSK'], relSignalStrength: 1 },
        { ssid: 'ssid2', security: ['WPA-EAP'], relSignalStrength: 2 },
        { ssid: 'ssid3', security: ['WPA-EAP'], relSignalStrength: 3 }
      ],
      set onsuccess(callback) {
        self._cb.onsuccess.push(callback);
      },
      set onerror(callback) {
        self._cb.onerror.push(callback);
      }
    };
  }
};
