define(function(require) {
  'use strict';
  var WifiHelper = require('shared/wifi_helper');

  var WifiManageNetworks = function() {
    return {
      onInit: function(panel) {
        this._elements = {};
        this._elements.panel = panel;
        this._elements.knownNetworkListWrapper =
          panel.querySelector('#wifi-knownNetworks');
        this._elements.forgetNetworkDialog =
          panel.querySelector('form');
        this._gWifiManager = WifiHelper.getWifiManager();
      },
      onBeforeShow: function() {
        this._scan();
        this._cleanup();
      },
      _cleanup: function() {
        var wrapper = this._elements.knownNetworkListWrapper;
        while(wrapper.hasChildNodes()) {
          wrapper.removeChild(wrapper.firstChild);
        }
      },
      _scan: function() {
        var req = this._gWifiManager.getKnownNetworks();

        req.onsuccess = function() {
          var allNetworks = req.result;
          var networks = {};
          var i;

          for (i = 0; i < allNetworks.length; ++i) {
            var network = allNetworks[i];
            // use ssid + capabilities as a composited key
            var key = network.ssid + '+' +
              WifiHelper.getSecurity(network).join('+');
            networks[key] = network;
          }

          var networkKeys = Object.getOwnPropertyNames(networks);
          this._cleanup();

          if (networkKeys.length) {
            networkKeys.sort();
            for (i = 0; i < networkKeys.length; i++) {
              var aItem = WifiHelper.newListItem(
                networks[networkKeys[i]], this._forgetNetwork.bind(this));

              this._elements.knownNetworkListWrapper.appendChild(aItem);
            }
          } else {
            // display a "no known networks" message if necessary
            this._elements.knownNetworkListWrapper.appendChild(
              WifiHelper.newExplanationItem('noKnownNetworks'));
          }
        }.bind(this);

        req.onerror = function onScanError(error) {
          console.warn('wifi: could not retrieve any known network. ');
        };
      },
      _forgetNetwork: function(network) {
        var forgetNetworkDialog = this._elements.forgetNetworkDialog;
        forgetNetworkDialog.hidden = false;

        forgetNetworkDialog.onsubmit = function forget() {
          this._gWifiManager.forget(network);
          this._scan();
          forgetNetworkDialog.hidden = true;
          return false;
        }.bind(this);

        forgetNetworkDialog.onreset = function cancel() {
          forgetNetworkDialog.hidden = true;
          return false;
        };
      }
    };
  };

  return WifiManageNetworks;
});
