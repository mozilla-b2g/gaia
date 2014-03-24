/* exported MockNavigatorMozWifiManager */

'use strict';

var MockNavigatorMozWifiManager = (function() {
  var networks;
  var knownNetworks = [];

  function mwm_setNetworks(networks) {
    networks = networks;
  }

  function mwm_associate(network) {
    if (network.dontConnect) {
      delete network.dontConnect;
    }
    knownNetworks.push(network);
  }

  function mwm_getKnownNetworks() {
    /*jshint validthis: true */
    var self = this;
    return {
      result: self.knownNetworks,
      set onsuccess(callback) {
        this.result = self.knownNetworks;
        callback && callback(this);
      },
      get onsuccess() {
      }
    };
  }

  function mwm_mSetup() {
    networks = undefined;
    knownNetworks = [];
  }

  return {
    get networks() {
      return networks;
    },
    get knownNetworks() {
      return knownNetworks;
    },
    setNetworks: mwm_setNetworks,
    connection: {
      network: null
    },
    associate: mwm_associate,
    getKnownNetworks: mwm_getKnownNetworks,
    mSetup: mwm_mSetup
  };
})();

window.MockNavigatorMozWifiManager = MockNavigatorMozWifiManager;
