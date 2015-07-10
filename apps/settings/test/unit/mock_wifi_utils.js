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
    checkPassword: function() {

    }
  };

  return MockWifiUtils;
});
