define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var WifiUtils = require('modules/wifi_utils');
  var WifiHelper = require('shared/wifi_helper');
  var WifiContext = require('modules/wifi_context');
  var wifiManager = WifiHelper.getWifiManager();

  var WifiNetworkList = function(elements) {
    var list = elements.wifiAvailableNetworks;

    var wifiNetworkList = {
      _scanRate: 5000, // 5s after last scan results
      _scanning: false,
      _autoscan: false,
      _index: {}, // index of all scanned networks
      _networks: {},
      _list: elements.wifiAvailableNetworks,
      clear: function(addScanningItem) {
        // clear the network list
        this._index = {};
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
      scan: function() {
        window.performance.measure('settingsPanelWifiVisible', 'wifiListStart');

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
            var key = WifiUtils.getNetworkKey(network);
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
              var listItem = WifiUtils.newListItem({
                network: network,
                onClick: self._toggleNetwork.bind(self),
                showNotInRange: true
              });
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

          window.performance.measure('settingsPanelWifiReady', 'wifiListStart');

          // auto-rescan if requested
          if (self._autoscan) {
            window.setTimeout(self.scan.bind(self), self._scanRate);
          }

          self._scanning = false;
        };

        req.onerror = function onScanError(error) {
          // always try again.
          self._scanning = false;

          window.performance.measure('settingsPanelWifiReady', 'wifiListStart');

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
      _toggleNetwork: function(network) {
        var self = this;

        var keys = WifiHelper.getSecurity(network);
        var security = (keys && keys.length) ? keys.join(', ') : '';
        var sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);

        if (WifiHelper.isConnected(network)) {
          // online: show status + offer to disconnect
          DialogService.show('wifi-status', {
            sl: sl,
            network: network,
            security: security,
          }).then(function(result) {
            var type = result.type;
            if (type === 'submit') {
              WifiContext.forgetNetwork(network, function() {
                self.scan();
              });
            }
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
              DialogService.show('wifi-auth', {
                sl: sl,
                security: security,
                network: network,
              }).then(function(result) {
                var type = result.type;
                var authOptions = result.value;
                if (type === 'submit') {
                  WifiHelper.setPassword(
                    network,
                    authOptions.password,
                    authOptions.identity,
                    authOptions.eap,
                    authOptions.authPhase2,
                    authOptions.serverCertificate
                  );
                  WifiContext.associateNetwork(network);
                }
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
    WifiContext.addEventListener('wifiEnabled', function(event) {
      WifiUtils.updateListItemStatus({
        listItems: wifiNetworkList._index,
        activeItemDOM: list.querySelector('.active'),
        network: event.network,
        networkStatus: event.status
      });
    });

    WifiContext.addEventListener('wifiStatusChange', function(event) {
      WifiUtils.updateListItemStatus({
        listItems: wifiNetworkList._index,
        activeItemDOM: list.querySelector('.active'),
        network: event.network,
        networkStatus: event.status
      });
    });

    WifiContext.addEventListener('wifiConnectionInfoUpdate', function(event) {
      WifiUtils.updateNetworkSignal(event.network, event.relSignalStrength);
    });

    return wifiNetworkList;
  };

  return WifiNetworkList;
});
