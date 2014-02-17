'use strict';

var MockNavigatorMozWifiManager = {

    knownNetworks: [],

    setNetworks: function(networks) {
      this.networks = networks;
    },
    getNetworks: function() {
      var self = this;
      return {
        result: self.networks,
        set onsuccess(callback) {
          this.result = self.networks;
          callback(this);
        }
      };
    },
    connection: {
      network: null
    },

    associate: function(network) {
      if (network.dontConnect) {
        delete network.dontConnect;
      }
      this.knownNetworks.push(network);
    },

    getKnownNetworks: function() {
      var self = this;
      return {
        result: self.knownNetworks,
        set onsuccess(callback) {
          this.result = self.knownNetworks;
          callback && callback(this);
        }
      };
    },

    mSetup: function() {
      delete this.networks;
      this.knownNetworks = [];
    }
};
