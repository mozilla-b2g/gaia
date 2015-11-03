requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

suite('WiFi Network List >', function() {
  'use strict';

  var wifiAvailableNetworksDiv = document.createElement('ul');
  var scanItemDiv = document.createElement('li');
  wifiAvailableNetworksDiv.appendChild(scanItemDiv);

  var wifiNetworkList;
  var mockWifiHelper;
  var elements = {
    wifiAvailableNetworks: wifiAvailableNetworksDiv,
    infoItem: {},
    scanItem: scanItemDiv,
    wifiItem: {}
  };

  suiteSetup(function(done) {
    var map = {
      '*': {
        'modules/dialog_service': 'unit/mock_dialog_service',
        'modules/wifi_utils': 'unit/mock_wifi_utils',
        'shared/wifi_helper': 'shared_mocks/mock_wifi_helper',
        'modules/wifi_context': 'unit/mock_wifi_context'
      }
    };

    var modules = [
      'panels/wifi/wifi_network_list',
      'shared/wifi_helper'
    ];

    testRequire(modules, map, function(WifiNetworkList, MockWifiHelper) {
      wifiNetworkList = WifiNetworkList(elements);
      mockWifiHelper = MockWifiHelper;

      sinon.stub(window.performance);
      done();
    });
  });

  suite('scan >', function() {
    test('should sort network by signal levels and ssid names', function() {
      sinon.stub(wifiNetworkList, 'clear');
      sinon.stub(mockWifiHelper, 'getAvailableAndKnownNetworks', function() {
        var self = this;
        return {
          result: [
            { ssid: 'ssid5', security: ['WPA-PSK'], relSignalStrength: 20 },
            { ssid: 'ssid4', security: ['WPA-EAP'], relSignalStrength: 100 },
            { ssid: 'ssid3', security: ['WPA-EAP'], relSignalStrength: 80 },
            { ssid: 'ssid2', security: ['WPA-EAP'], relSignalStrength: 60 },
            { ssid: 'ssid1', security: ['WPA-EAP'], relSignalStrength: 60 }
          ],
          set onsuccess(callback) {
            self._cb.onsuccess.push(callback);
          },
          set onerror(callback) {
            self._cb.onerror.push(callback);
          }
        };
      });
      wifiNetworkList.scan();
      mockWifiHelper._cb.onsuccess.forEach((cb) => {
        cb();
      });
      assert.deepEqual(
        Object.getOwnPropertyNames(wifiNetworkList._index),
        ['ssid3', 'ssid4', 'ssid1', 'ssid2', 'ssid5']
      );
    });
  });
});
