define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsUtils = require('modules/settings_utils');
  var WifiContext = require('modules/wifi_context');
  var WifiUtils = require('modules/wifi_utils');
  var WifiHelper = require('shared/wifi_helper');
  var WifiKnownNetworks =
    require('panels/wifi_manage_networks/wifi_known_networks');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_wifi_manage_networks_panel() {
    var elements = {};
    return SettingsPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.knownNetworkListWrapper =
          panel.querySelector('#wifi-knownNetworks');
        elements.forgetNetworkDialog =
          panel.querySelector('form');
        elements.macAddress =
          panel.querySelector('[data-name="deviceinfo.mac"]');
        elements.joinHiddenBtn =
          panel.querySelector('#joinHidden');
        elements.joinHiddenBtn.addEventListener('click', function() {
          var network = {};
          SettingsUtils.openDialog('wifi-joinHidden', {
            network: network,
            onSubmit: function(network) {
              if (window.MozWifiNetwork !== undefined) {
                network = new window.MozWifiNetwork(network);
              }
              WifiContext.associateNetwork(network);
            }.bind({}, network)
          });
        });

        // we would update this value all the time
        SettingsListener.observe('deviceinfo.mac', '', function(macAddress) {
          elements.macAddress.textContent = macAddress;
        });
      },
      onBeforeShow: function(panel) {
        this._cleanup();
        this._scan();
      },
      _cleanup: function() {
        var wrapper = elements.knownNetworkListWrapper;
        while (wrapper.hasChildNodes()) {
          wrapper.removeChild(wrapper.firstChild);
        }
      },
      _scan: function() {
        WifiKnownNetworks.scan(function(networks) {
          var networkKeys = Object.getOwnPropertyNames(networks);
          if (networkKeys.length) {
            networkKeys.sort();
            for (var i = 0; i < networkKeys.length; i++) {
              var aItem = WifiUtils.newListItem(
                networks[networkKeys[i]], this._forgetNetwork.bind(this));
              elements.knownNetworkListWrapper.appendChild(aItem);
            }
          } else {
            // display a "no known networks" message if necessary
            elements.knownNetworkListWrapper.appendChild(
              WifiUtils.newExplanationItem('noKnownNetworks'));
          }
        }.bind(this));
      },
      _forgetNetwork: function(network) {
        var self = this;
        var forgetNetworkDialog = elements.forgetNetworkDialog;
        forgetNetworkDialog.hidden = false;

        forgetNetworkDialog.onsubmit = function forget() {
          var request = wifiManager.forget(network);
          request.onsuccess = function() {
            self._cleanup();
            self._scan();
            forgetNetworkDialog.hidden = true;
          };
          return false;
        };

        forgetNetworkDialog.onreset = function cancel() {
          forgetNetworkDialog.hidden = true;
          return false;
        };
      }
    });
  };
});
