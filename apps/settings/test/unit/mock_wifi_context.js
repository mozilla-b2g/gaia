define(function() {
  'use strict';

  var MockWifiContext = {
    _callbacks: [],
    currentNetwork: {},
    wps: {
      selectedAp: '',
      selectedMethod: '',
      pin: ''
    },
    associateNetwork: function(network) {},
    forgetNetwork: function(network) {},
    addEventListener: function(callback) {
      this._callbacks.push(callback);
    }
  };

  return MockWifiContext;
});
