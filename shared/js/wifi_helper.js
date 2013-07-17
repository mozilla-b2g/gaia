'use strict';

var WifiHelper = {
  getWifiManager: function() {
    return this.wifiManager;
  },

  // create a fake mozWifiManager if required (e.g. desktop browser)
  wifiManager: function() {
    var navigator = window.navigator;
    if ('mozWifiManager' in navigator)
      return navigator.mozWifiManager;

    /**
     * fake network list, where each network object looks like:
     * {
     *   ssid              : SSID string (human-readable name)
     *   bssid             : network identifier string
     *   security          : array of strings (supported authentication methods)
     *   relSignalStrength : 0-100 signal level (integer)
     *   connected         : boolean state
     * }
     */

    var fakeNetworks = [
      {
        ssid: 'Mozilla-G',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: ['WPA-EAP'],
        relSignalStrength: 67,
        connected: false
      },
      {
        ssid: 'Livebox 6752',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: ['WEP'],
        relSignalStrength: 32,
        connected: false
      },
      {
        ssid: 'Mozilla Guest',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: [],
        relSignalStrength: 98,
        connected: false
      },
      {
        ssid: 'Freebox 8953',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: ['WPA2-PSK'],
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
  }(),

  setPassword: function(network, password, identity) {
    var encType = this.getKeyManagement(network);
    switch (encType) {
      case 'WPA-PSK':
        network.psk = password;
        break;
      case 'WPA-EAP':
        network.password = password;
        if (identity && identity.length) {
          network.identity = identity;
        }
        break;
      case 'WEP':
        network.wep = password;
        break;
      default:
        return;
    }
    network.keyManagement = encType;
  },

  setSecurity: function(network, encryptions) {
    // Bug 791506: Code for backward compatibility. Modify after landed.
    if (network.security === undefined) {
      network.capabilities = encryptions;
    } else {
      network.security = encryptions;
    }
  },

  getSecurity: function(network) {
    // Bug 791506: Code for backward compatibility. Modify after landed.
    return network.security === undefined ?
      network.capabilities : network.security;
  },

  getCapabilities: function(network) {
    // Bug 791506: Code for backward compatibility. Modify after landed.
    return network.security === undefined ? [] : network.capabilities;
  },

  getKeyManagement: function(network) {
    var key = this.getSecurity(network)[0];
    if (/WEP$/.test(key))
      return 'WEP';
    if (/PSK$/.test(key))
      return 'WPA-PSK';
    if (/EAP$/.test(key))
      return 'WPA-EAP';
    return '';
  },

  isConnected: function(network) {
    /**
     * XXX the API should expose a 'connected' property on 'network',
     * and 'wifiManager.connection.network' should be comparable to 'network'.
     * Until this is properly implemented, we just compare SSIDs to tell wether
     * the network is already connected or not.
     */
    var currentNetwork = this.wifiManager.connection.network;
    if (!currentNetwork || !network)
      return false;
    var key = network.ssid + '+' + this.getSecurity(network).join('+');
    var curkey = currentNetwork.ssid + '+' +
        this.getSecurity(currentNetwork).join('+');
    return key === curkey;
  },

  isValidInput: function(key, password, identity) {
    function isValidWepKey(password) {
      switch (password.length) {
        case 5:
        case 13:
        case 16:
        case 29:
          return true;
        case 10:
        case 26:
        case 32:
        case 58:
          return !/[^a-fA-F0-9]/.test(password);
        default:
          return false;
      }
    }

    switch (key) {
      case 'WPA-PSK':
        if (!password || password.length < 8)
          return false;
        break;
      case 'WPA-EAP':
        if (!password || password.length < 1 ||
            !identity || identity.length < 1)
          return false;
        break;
      case 'WEP':
        if (!password || !isValidWepKey(password))
          return false;
        break;
    }
    return true;
  },

  isWpsAvailable: function(network) {
    var capabilities = this.getCapabilities(network);
    for (var i = 0; i < capabilities.length; i++) {
      if (/WPS/.test(capabilities[i])) {
        return true;
      }
    }
    return false;
  },

  isOpen: function(network) {
    return this.getKeyManagement(network) === '';
  },

  isEap: function(network) {
    return this.getKeyManagement(network).indexOf('EAP') !== -1;
  }
};
