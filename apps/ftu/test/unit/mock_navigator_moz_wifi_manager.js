'use strict';

var MockNavigatorMozWifiManager = {

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
    }
};
