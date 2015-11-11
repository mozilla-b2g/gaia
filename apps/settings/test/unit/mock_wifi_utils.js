define(function() {
  'use strict';
  var MockWifiUtils = {
    _network: {},
    wifiDialog: function(dialogID, options) {
      var self = this;
      if (options.callback) {
        setTimeout(function() {
          options.callback(self._network);
        });
      }
    },
    wifiConnect: function() {},
    wifiDisconnect: function() {},
    newExplanationItem: function(message) {
      return document.createElement('div');
    },
    newListItem: function(options) {
      var item = document.createElement('li');
      item.setAttribute('network', options.network);
      return item;
    },
    checkPassword: function() {

    },
    changeDisplay: function() {
  
    },
    getNetworkKey: function(network) {
      return network ? network.ssid : '';
    }
  };

  return MockWifiUtils;
});
