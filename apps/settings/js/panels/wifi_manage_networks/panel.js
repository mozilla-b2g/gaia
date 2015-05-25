define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var SettingsListener = require('shared/settings_listener');
  var SettingsPanel = require('modules/settings_panel');
  var WifiContext = require('modules/wifi_context');
  var WifiUtils = require('modules/wifi_utils');
  var WifiHelper = require('shared/wifi_helper');
  var WifiKnownNetworks =
    require('panels/wifi_manage_networks/wifi_known_networks');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_wifi_manage_networks_panel() {
    var elements = {};
    var listItems = {};

    return SettingsPanel({
      onInit: function(panel) {
        var self = this;
        elements.panel = panel;
        elements.knownNetworkListWrapper =
          panel.querySelector('.wifi-knownNetworks');
        elements.forgetNetworkDialog =
          panel.querySelector('form');
        elements.macAddress =
          panel.querySelector('[data-name="deviceinfo.mac"]');
        elements.joinHiddenBtn =
          panel.querySelector('.joinHidden');
        elements.joinHiddenBtn.addEventListener('click', function() {
          DialogService.show('wifi-joinHidden').then(function(result) {
            var network;
            var type = result.type;
            var value = result.value;

            if (type === 'submit') {
              if (window.MozWifiNetwork !== undefined) {
                network = new window.MozWifiNetwork(value.network);
              }
              WifiHelper.setPassword(
                network,
                value.password,
                value.identity,
                value.eap
              );
              WifiContext.associateNetwork(network, function(error) {
                if (error) {
                  // TODO
                  // Show some error later
                }
                self._cleanup();
                self._scan();
              });
            }
          });
        });
        // we would update this value all the time
        SettingsListener.observe('deviceinfo.mac', '', function(macAddress) {
          elements.macAddress.textContent = macAddress;
        });

        WifiContext.addEventListener('wifiEnabled', function(event) {
          var activeItem =
            elements.knownNetworkListWrapper.querySelector('.active');
          WifiUtils.updateListItemStatus({
            listItems: listItems,
            activeItemDOM: activeItem,
            network: event.network,
            networkStatus: event.status
          });
        });

        WifiContext.addEventListener('wifiStatusChange', function(event) {
          var activeItem =
            elements.knownNetworkListWrapper.querySelector('.active');
          WifiUtils.updateListItemStatus({
            listItems: listItems,
            activeItemDOM: activeItem,
            network: event.network,
            networkStatus: event.status
          });
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
        listItems = {};
      },
      _scan: function() {
        WifiKnownNetworks.scan(function(networks) {
          var networkKeys = Object.getOwnPropertyNames(networks);
          var network;
          if (networkKeys.length) {
            networkKeys.sort();

            for (var i = 0; i < networkKeys.length; i++) {
              network = networks[networkKeys[i]];
              var aItem = WifiUtils.newListItem({
                network: network,
                onClick: this._forgetNetwork.bind(this),
                showNotInRange: false
              });

              if (WifiHelper.isConnected(network)) {
                elements.knownNetworkListWrapper.insertBefore(
                  aItem, elements.knownNetworkListWrapper.firstChild);
              } else {
                elements.knownNetworkListWrapper.appendChild(aItem);
              }

              // We have to keep them so that we can easily update
              // its status without cleanup
              listItems[networkKeys[i]] = aItem;
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
