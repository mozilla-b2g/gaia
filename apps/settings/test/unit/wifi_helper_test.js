'use strict';

require('/shared/js/wifi_helper.js');

suite('WifiHelper', function() {

  suite('> getAvailableAndKnownNetworks()', function() {
    var originalMozWifiManager;
    var triggerCallback = function triggerCallback(which, successOrError) {
      if (fakeDOMRequests[which] && fakeDOMRequests[which][successOrError]) {
        fakeDOMRequests[which][successOrError]();
      }
    };
    var fakeDOMRequests = {
      'getNetworks': {
        readyState: 'pending',
        result: [
          {
            ssid: 'Mozilla',
            bssid: 'xx:xx:xx:xx:xx:xx',
            security: ['WPA-EAP'],
            relSignalStrength: 67,
            connected: false
          },
          {
            ssid: 'Mozilla-Guest',
            bssid: 'xx:xx:xx:xx:xx:xx',
            security: [],
            relSignalStrength: 50,
            connected: false
          }
        ],
        error: {
          name: 'getNetworks error'
        }
      },
      'getKnownNetworks': {
        readyState: 'pending',
        result: [
         {
            ssid: 'No broadcast',
            bssid: 'xx:xx:xx:xx:xx:xx',
            security: ['WEP'],
            relSignalStrength: 89,
            connected: false
          }
        ],
        error: {
          name: 'getKnownNetworks error'
        }
      }
    };

    suiteSetup(function() {
      originalMozWifiManager = navigator.mozWifiManager;
      navigator.mozWifiManager = {
        getNetworks: function fakeGetNetworks() {
          return fakeDOMRequests.getNetworks;
        },
        getKnownNetworks: function fakeGetKnownNetworks() {
          return fakeDOMRequests.getKnownNetworks;
        }
      };
      // Force to use our mozWifiManager instead of the stub of desktop-helper
      WifiHelper.wifiManager = navigator.mozWifiManager;
    });

    suiteTeardown(function() {
      navigator.mozWifiManager = originalMozWifiManager;
    });

    test('> getNetworks return 2 networks then getKnownNetworks' +
      'return 1 network successfully', function() {
        var req = WifiHelper.getAvailableAndKnownNetworks();
        var callbackInvokedTimes = 0;
        req.onsuccess = function success() {
          callbackInvokedTimes += 1;
          assert.isTrue(req.result !== null);
          assert.isTrue(req.result.length === 3);
        };
        req.onerror = function error() {
          assert.fail();
        };
        triggerCallback('getNetworks', 'onsuccess');
        triggerCallback('getKnownNetworks', 'onsuccess');
        assert.isTrue(callbackInvokedTimes === 1);
      });

    test('> getNetworks return 2 networks then getKnownNetworks' +
      'return error', function() {
        var req = WifiHelper.getAvailableAndKnownNetworks();
        var callbackInvokedTimes = 0;
        req.onsuccess = function success() {
          callbackInvokedTimes += 1;
          assert.isTrue(req.result !== null);
          assert.isTrue(req.result.length === 2);
        };
        req.onerror = function error() {
          assert.fail();
        };
        triggerCallback('getNetworks', 'onsuccess');
        triggerCallback('getKnownNetworks', 'onerror');
        assert.isTrue(callbackInvokedTimes === 1);
      });

    test('> both getNetworks and getKnownNetworks return error', function() {
      var req = WifiHelper.getAvailableAndKnownNetworks();
      var callbackInvokedTimes = 0;
      req.onsuccess = function success() {
        assert.fail();
      };
      req.onerror = function error() {
        callbackInvokedTimes += 1;
        assert.ok(req.error);
      };
      triggerCallback('getNetworks', 'onerror');
      triggerCallback('getKnownNetworks', 'onerror');
      assert.isTrue(callbackInvokedTimes === 1);
    });
  });

});
