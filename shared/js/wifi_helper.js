/* exported WifiHelper */
'use strict';

var WifiHelper = {
  getWifiManager: function() {
    return this.wifiManager;
  },

  wifiManager: function() {
    return navigator.mozWifiManager;
  }(),

  setPassword: function(network, password, identity, eap, phase2, certificate) {
    var encType = this.getKeyManagement(network);
    switch (encType) {
      case 'WPA-PSK':
        network.psk = password;
        break;
      case 'WPA-EAP':
        network.eap = eap;
        switch (eap) {
          case 'SIM':
            break;
          case 'PEAP':
          case 'TLS':
          case 'TTLS':
            if (password && password.length) {
              network.password = password;
            }
            if (identity && identity.length) {
              network.identity = identity;
            }
            if (phase2 != 'No') {
              network.phase2 = phase2;
            }
            if (certificate != 'none') {
              network.serverCertificate = certificate;
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
    network.security = encryptions;
  },

  getSecurity: function(network) {
    return network.security;
  },

  getCapabilities: function(network) {
    return network.capabilities === undefined || network.capabilities === null ?
           [] : network.capabilities;
  },

  getKeyManagement: function(network) {
    var key = this.getSecurity(network)[0];
    if (/WEP$/.test(key)) {
      return 'WEP';
    }
    if (/PSK$/.test(key)) {
      return 'WPA-PSK';
    }
    if (/EAP$/.test(key)) {
      return 'WPA-EAP';
    }
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
    if (!currentNetwork || !network) {
      return false;
    }
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
        if (!password || password.length < 8) {
          return false;
        }
        break;
      case 'WPA-EAP':
        switch (eap) {
          case 'SIM':
            break;
          case 'PEAP':
          case 'TLS':
          case 'TTLS':
            /* falls through */
          default:
            if (!password || password.length < 1 ||
                !identity || identity.length < 1) {
              return false;
            }
            break;
        }
        break;
      case 'WEP':
        if (!password || !isValidWepKey(password)) {
          return false;
        }
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
  },

  // Both 'available' and 'known' are "object of networks".
  // Each key of them is a composite key of a network,
  // and each value is the original network object received from DOMRequest
  // It'll be easier to compare in the form of "object of networks"
  _unionOfNetworks: function(available, known) {
    var allNetworks = available || {};
    var result = [];
    Object.keys(known).forEach(function(key) {
      if (!allNetworks[key]) {
        allNetworks[key] = known[key];
      }
    });
    // However, people who use getAvailableAndKnownNetworks expect
    // getAvailableAndKnownNetworks.result to be an array of network
    Object.keys(allNetworks).forEach(function(key) {
      result.push(allNetworks[key]);
    });
    return result;
  },

  _networksArrayToObject: function(allNetworks) {
    var self = this;
    var networksObject = {};
    [].forEach.call(allNetworks, function(network) {
      // use ssid + security as a composited key
      var key = network.ssid + '+' +
        self.getSecurity(network).join('+');
      // ensure the wifi AP with the strongest signal is picked from wifi APs
      // with the same SSID
      if (!networksObject[key] ||
          network.relSignalStrength > networksObject[key].relSignalStrength) {
        networksObject[key] = network;
      }
    });
    return networksObject;
  },

  _onReqProxySuccess: function(reqProxy, availableNetworks, knownNetworks) {
    reqProxy.result =
      this._unionOfNetworks(availableNetworks, knownNetworks);
    reqProxy.onsuccess();
  },

  getAvailableAndKnownNetworks: function() {
    var self = this;
    var reqProxy = {
      onsuccess: function() {},
      onerror: function() {}
    };
    var knownNetworks = {};
    var availableNetworks = {};
    var knownNetworksReq = null;
    var availableNetworksReq = this.getWifiManager().getNetworks();

    // request available networks first then known networks,
    // since it is acceptible that error on requesting known networks
    availableNetworksReq.onsuccess = function anrOnSuccess() {
      availableNetworks =
        self._networksArrayToObject(availableNetworksReq.result);
      knownNetworksReq = self.getWifiManager().getKnownNetworks();
      knownNetworksReq.onsuccess = function knrOnSuccess() {
        knownNetworks = self._networksArrayToObject(knownNetworksReq.result);
        self._onReqProxySuccess(
          reqProxy, availableNetworks, knownNetworks);
      };
      knownNetworksReq.onerror = function knrOnError() {
        // it is acceptible that no known networks found or error
        // on requesting known networks
        self._onReqProxySuccess(
          reqProxy, availableNetworks, knownNetworks);
      };
    };
    availableNetworksReq.onerror = function anrOnError() {
      reqProxy.error = availableNetworksReq.error;
      reqProxy.onerror();
    };
    return reqProxy;
  }
};
