/* global PerformanceTestingHelper */
define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var WifiUtils = require('modules/wifi_utils');
  var WifiHelper = require('shared/wifi_helper');
  var WifiContext = require('modules/wifi_context');
  var wifiManager = WifiHelper.getWifiManager();
  var _ = navigator.mozL10n.get;

  var WifiNetworkList = function(elements) {
    var list = elements.wifiAvailableNetworks;

    var wifiNetworkList = {
      _scanRate: 5000, // 5s after last scan results
      _scanning: false,
      _autoscan: false,
      _index: [], // index of all scanned networks
      _networks: {},
      _list: elements.wifiAvailableNetworks,
      clear: function(addScanningItem) {
        // clear the network list
        this._index = [];
        this._networks = {};

        // remove all items except the text expl.
        // and the "search again" button
        var wifiItems = list.querySelectorAll('li:not([data-state])');
        var len = wifiItems.length;
        for (var i = len - 1; i >= 0; i--) {
          list.removeChild(wifiItems[i]);
        }

        list.dataset.state = addScanningItem ? 'on' : 'off';
      },
      display: function() {
        var network =
          WifiContext.currentNetwork || wifiManager.connection.network;
        var networkStatus = wifiManager.connection.status;

        // display a message on the network item matching the ssid
        if (!network) {
          return;
        }

        var key = this._getNetworkKey(network);
        var listItem = this._index[key];
        var active = list.querySelector('.active');

        if (active && active != listItem) {
          active.classList.remove('active');
          active.querySelector('small').textContent =
            _('shortStatus-disconnected');
          active.querySelector('aside').classList.remove('connecting');
          active.querySelector('aside').classList.remove('connected');
        }
        if (listItem) {
          listItem.classList.add('active');
          listItem.querySelector('small').textContent =
            _('shortStatus-' + networkStatus);
          if (networkStatus === 'connecting') {
            listItem.querySelector('aside').classList.add('connecting');
          }
          if (networkStatus === 'connected') {
            listItem.querySelector('aside').classList.remove('connecting');
          }
        }
      },
      scan: function() {
        PerformanceTestingHelper.dispatch('settings-panel-wifi-visible');

        // scan wifi networks and display them in the list
        var self = this;
        if (this._scanning) {
          return;
        }

        // stop auto-scanning if wifi disabled or the app is hidden
        if (!wifiManager.enabled || document.hidden) {
          this._scanning = false;
          return;
        }

        this._scanning = true;
        var req = WifiHelper.getAvailableAndKnownNetworks();

        req.onsuccess = function onScanSuccess() {
          self.clear(false);
          var allNetworks = req.result;
          var network;

          for (var i = 0; i < allNetworks.length; ++i) {
            network = allNetworks[i];
            var key = self._getNetworkKey(network);
            // keep connected network first, or select the highest strength
            if (!self._networks[key] || network.connected) {
              self._networks[key] = network;
            } else {
              if (!self._networks[key].connected &&
                network.relSignalStrength >
                  self._networks[key].relSignalStrength) {
                    self._networks[key] = network;
              }
            }
          }

          var networkKeys = Object.getOwnPropertyNames(self._networks);

          // display network list
          if (networkKeys.length) {
            // sort networks by signal strength
            networkKeys.sort(function(a, b) {
              return self._networks[b].relSignalStrength -
                self._networks[a].relSignalStrength;
            });

            // add detected networks
            for (var j = 0; j < networkKeys.length; j++) {
              network = self._networks[networkKeys[j]];
              var listItem = WifiUtils.newListItem(network,
                self._toggleNetwork.bind(self));
              // put connected network on top of list
              if (WifiHelper.isConnected(network)) {
                list.insertBefore(listItem,
                  elements.infoItem.nextSibling);
              } else {
                list.insertBefore(listItem, elements.scanItem);
              }
              // add composited key to index
              self._index[networkKeys[j]] = listItem;
            }
          } else {
            // display a "no networks found" message if necessary
            list.insertBefore(
              WifiUtils.newExplanationItem('noNetworksFound'),
                elements.scanItem);
          }

          // display the "Search Again" button
          list.dataset.state = 'ready';

          PerformanceTestingHelper.dispatch('settings-panel-wifi-ready');

          // auto-rescan if requested
          if (self._autoscan) {
            window.setTimeout(self.scan.bind(self), self._scanRate);
          }

          self._scanning = false;
        };

        req.onerror = function onScanError(error) {
          // always try again.
          self._scanning = false;

          PerformanceTestingHelper.dispatch('settings-panel-wifi-ready');

          window.setTimeout(self.scan.bind(self), self._scanRate);
        };
      },
      getWpsAvailableNetworks: function() {
        // get WPS available networks
        var ssids = Object.getOwnPropertyNames(this._networks);
        var wpsAvailableNetworks = [];
        for (var i = 0; i < ssids.length; i++) {
          var network = this._networks[ssids[i]];
          if (WifiHelper.isWpsAvailable(network)) {
            wpsAvailableNetworks.push(network);
          }
        }
        return wpsAvailableNetworks;
      },
      set autoscan(value) {
        this._autoscan = value;
      },
      get autoscan() {
        return this._autoscan;
      },
      get scanning() {
        return this._scanning;
      },
      // use ssid + security as a composited key
      _getNetworkKey: function(network) {
        var key = network.ssid + '+' +
          WifiHelper.getSecurity(network).join('+');
        return key;
      },
      _toggleNetwork: function(network) {
        var self = this;

        var keys = WifiHelper.getSecurity(network);
        var security = (keys && keys.length) ? keys.join(', ') : '';
        var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);

        if (WifiHelper.isConnected(network)) {
          // online: show status + offer to disconnect
          SettingsUtils.openDialog('wifi-status', {
            sl: sl,
            network: network,
            security: security,
            onSubmit: function(network) {
              // disconnect first, then rescan
              WifiContext.forgetNetwork(network, function() {
                self.scan();
              });
            }.bind({}, network),
          });
        } else if (network.password && (network.password == '*')) {
          // offline, known network (hence the '*' password value):
          // no further authentication required.
          WifiHelper.setPassword(network);
          WifiContext.associateNetwork(network);
        } else {
          // offline, unknown network: propose to connect
          var key = WifiHelper.getKeyManagement(network);
          switch (key) {
            case 'WEP':
            case 'WPA-PSK':
            case 'WPA-EAP':
              SettingsUtils.openDialog('wifi-auth', {
                sl: sl,
                security: security,
                network: network,
                onSubmit: function(network) {
                  var authOptions = WifiContext.authOptions;
                  WifiHelper.setPassword(
                    network,
                    authOptions.password,
                    authOptions.identity,
                    authOptions.eap,
                    authOptions.authPhase2,
                    authOptions.certificate
                  );
                  WifiContext.associateNetwork(network);
                }.bind({}, network)
              });
              break;
            default:
              WifiContext.associateNetwork(network);
              break;
          }
        }
      }
    };

    // networkStatus has one of the following values:
    // connecting, associated, connected, connectingfailed, disconnected.
    WifiContext.addEventListener('wifiEnabled',
      wifiNetworkList.display.bind(wifiNetworkList));
    WifiContext.addEventListener('wifiStatusChange',
      wifiNetworkList.display.bind(wifiNetworkList));

    return wifiNetworkList;
  };

  return WifiNetworkList;
});
