/* global Customizer */

'use strict';

var KnownNetworksCustomizer = (function() {

  Customizer.call(this, 'known_networks', 'json');

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

  function getNetwork(aNetParams) {
    if (!aNetParams || !aNetParams.ssid) {
      return;
    }
    var net = {};
    net.ssid = aNetParams.ssid;

    if (!aNetParams.keyType) {
      return net;
    }

    net.keyManagement = aNetParams.keyType;
    net.security = [aNetParams.keyType];
    net.capabilities = aNetParams.capabilities ? [aNetParams.capabilities] : [];

    switch (aNetParams.keyType) {
      case 'WPA-PSK':
        if (aNetParams.password && aNetParams.password.length >= 8) {
          net.psk = aNetParams.password;
        }
        break;
      case 'WPA-EAP':
        if (!aNetParams.eap) {
          break;
        }
        net.eap = aNetParams.eap;
        switch (aNetParams.eap) {
          case 'SIM':
            break;
          case 'PEAP':
          case 'TLS':
          case 'TTLS':
            var properties = ['password', 'identity', 'phase2', 'pin',
                              'serverCertificate'];
            for (var i = 0, l = properties.length; i < l; i++) {
              if (aNetParams[properties[i]]) {
                net[properties[i]] = aNetParams[properties[i]];
              }
            }
            break;
        }
        break;
      case 'WEP':
        if (aNetParams.password && isValidWepKey(aNetParams.password)) {
          net.wep = aNetParams.password;
        }
        break;
    }
    return net;
  }

  this.set = function(aNetworksParams) {
    if (!aNetworksParams) {
      return;
    }

    var wifiManager = navigator.mozWifiManager;
    if (!wifiManager) {
      return;
    }

    var req = wifiManager.getKnownNetworks();
    req.onerror = function onError() {
      console.log('Error configuring SV knownNetworks. ' + req.error.name);
      wifiManager = null;
    };

    req.onsuccess = function onSuccess() {
      var allKnownNetArr = req.result;
      var numKnownNet = allKnownNetArr.length;
      var allKnownNet = {};
      for (var i = 0; i < numKnownNet; i++) {
        allKnownNet[allKnownNetArr[i].ssid] = allKnownNetArr[i];
        if (aNetworksParams[allKnownNetArr[i].ssid]) {
          delete aNetworksParams[allKnownNetArr[i].ssid];
        }
      }
      allKnownNetArr = null;

      for (var key in aNetworksParams) {
        var netParams = aNetworksParams[key];
        if (!allKnownNet[netParams.ssid]) {
          var network = getNetwork(netParams);
          if (network) {
            network.dontConnect = true;
            wifiManager.associate(network);
            allKnownNet[network.ssid] = network;
          }
        }
      }
      wifiManager = null;
    };
  };
});

var knownNetworksCustomizer = new KnownNetworksCustomizer();
knownNetworksCustomizer.init();
