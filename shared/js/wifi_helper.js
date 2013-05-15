'use strict';

var WifiHelper = {
  // create a fake mozWifiManager if required (e.g. desktop browser)
  getWifiManager: function() {
    var navigator = window.navigator;
    if ('mozWifiManager' in navigator)
      return navigator.mozWifiManager;

    /**
     * fake network list, where each network object looks like:
     * {
     *   ssid              : SSID string (human-readable name)
     *   bssid             : network identifier string
     *   capabilities      : array of strings (supported authentication methods)
     *   relSignalStrength : 0-100 signal level (integer)
     *   connected         : boolean state
     * }
     */

    var fakeNetworks = [
      {
        ssid: 'Mozilla-G',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: ['WPA-EAP'],
        relSignalStrength: 67,
        connected: false
      },
      {
        ssid: 'Livebox 6752',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: ['WEP'],
        relSignalStrength: 32,
        connected: false
      },
      {
        ssid: 'Mozilla Guest',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: [],
        relSignalStrength: 98,
        connected: false
      },
      {
        ssid: 'Freebox 8953',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: ['WPA2-PSK'],
        relSignalStrength: 89,
        connected: false
      }
    ];

    function getFakeNetworks() {
      var request = { result: fakeNetworks };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
      }, 1000);

      return request;
    }

    return {
      // true if the wifi is enabled
      enabled: false,
      macAddress: 'xx:xx:xx:xx:xx:xx',

      // enables/disables the wifi
      setEnabled: function fakeSetEnabled(bool) {
        var self = this;
        var request = { result: bool };

        setTimeout(function() {
          if (request.onsuccess) {
            request.onsuccess();
          }
          if (bool) {
            self.onenabled();
          } else {
            self.ondisabled();
          }
        });

        self.enabled = bool;
        return request;
      },

      // returns a list of visible/known networks
      getNetworks: getFakeNetworks,
      getKnownNetworks: getFakeNetworks,

      // selects a network
      associate: function fakeAssociate(network) {
        var self = this;
        var connection = { result: network };
        var networkEvent = { network: network };

        setTimeout(function fakeConnecting() {
          self.connection.network = network;
          self.connection.status = 'connecting';
          self.onstatuschange(networkEvent);
        }, 0);

        setTimeout(function fakeAssociated() {
          self.connection.network = network;
          self.connection.status = 'associated';
          self.onstatuschange(networkEvent);
        }, 1000);

        setTimeout(function fakeConnected() {
          network.connected = true;
          self.connected = network;
          self.connection.network = network;
          self.connection.status = 'connected';
          self.onstatuschange(networkEvent);
        }, 2000);

        return connection;
      },

      // forgets a network (disconnect)
      forget: function fakeForget(network) {
        var self = this;
        var networkEvent = { network: network };

        setTimeout(function() {
          network.connected = false;
          self.connected = null;
          self.connection.network = null;
          self.connection.status = 'disconnected';
          self.onstatuschange(networkEvent);
        }, 0);
      },

      // event listeners
      onenabled: function(event) {},
      ondisabled: function(event) {},
      onstatuschange: function(event) {},

      // returns a network object for the currently connected network (if any)
      connected: null,

      connection: {
        status: 'disconnected',
        network: null
      }
    };
  },

  getKeyManagement: function(network) {
    var key = network.capabilities[0];
    if (/WEP$/.test(key))
      return 'WEP';
    if (/PSK$/.test(key))
      return 'WPA-PSK';
    if (/EAP$/.test(key))
      return 'WPA-EAP';
    return '';
  },

  isOpen: function(network) {
    return this.getKeyManagement(network) === '';
  },

  isEap: function(network) {
    return this.getKeyManagement(network).indexOf('EAP') !== -1;
  }
};
