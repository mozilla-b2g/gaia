define(function() {
  'use strict';

  var MockWifiContext = {
    currentNetwork: {},
    wps: {
      selectedAp: '',
      selectedMethod: '',
      pin: ''
    },
    associateNetwork: function(network) {},
    forgetNetwork: function(network) {}
  };

  return MockWifiContext;
});
