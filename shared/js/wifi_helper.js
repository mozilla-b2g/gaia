'use strict';

var WifiHelper = {
  getWifiManager: function() {
    return this.wifiManager;
  },

  wifiManager: function() {
    return navigator.mozWifiManager;
  }(),

  setPassword: function(network, password, identity, eap) {
    var encType = this.getKeyManagement(network);
    switch (encType) {
      case 'WPA-PSK':
        network.psk = password;
        break;
      case 'WPA-EAP':
        network.eap = eap;
        switch (eap) {
          case 'SIM':
            if (password && password.length) {
              network.password = password;
            }
            if (identity && identity.length) {
              network.identity = identity;
            }
            break;
          default:
            break;
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

  isValidInput: function(key, password, identity, eap) {
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
        switch (eap) {
          case 'SIM':
            break;
          default:
            if (!password || password.length < 1 ||
                !identity || identity.length < 1)
              return false;
            break;
        }
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
