/* global WifiHelper */
'use strict';

require('/shared/js/wifi_helper.js');

suite('WifiHelper', function() {

  suite('> isValidInput()', function(){

    test('Test WEP network >', function(){
      var network_security = 'WEP';
      var password = '';

      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid if not using password');

      password = 'I234'; // 4 ASCII char
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid if password is too short');

      password = 'ABC12'; // 5 ASCII char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 5 ASCII char');

      password = 'ABCDEFG123456'; // 13 ASCII char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 13 ASCII char');

      password = 'QWERTYUIOP123456'; // 16 ASCII char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 16 ASCII char');

      password = 'QWERTYUIOPASDFGHJKLZXCVBNM123'; // 29 ASCII char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 29 ASCII char');

      password = '123456AB'; // 8 ASCII char
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid with 8 ASCII char');

      password = 'ABCD'; // 4 HEX char
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid with 4 HEX char');

      password = 'ABCDE12345'; // 10 HEX char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 10 HEX char');

      password = 'ABCGH12345'; // 10 HEX invalid char
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid with 10 not HEX char');

      password = 'ABCDEF123456ABCDEF123456AB'; // 26 HEX char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 26 HEX char');

      password = 'ABCGH12345ABCGH12345123456'; // 26 HEX invalid char
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid with 26 not HEX char');

      password = 'ABCDEF123456ABCDEF123456ABCDEF12'; // 32 HEX char
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 32 HEX char');

      password = 'ABCGH12345ABCGH12345123456GGGG12'; // 32 HEX invalid char
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid with 32 not HEX char');

      // 26 HEX char
      password = 'ABCDEF123456ABCDEF123456ABABCDEF123456ABCDEF123456AB123456';
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid with 58 HEX char');

      // 58 HEX invalid char
      password = 'ABCGH12345ABCGH12345123456ABCGH12345ABCGH12345123456ABCGH1';
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid with 58 not HEX char');
    });

    test('Test WPA-PSK network >', function() {
      var network_security = 'WPA-PSK';
      var password = '';

      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid if not using password');

      password = '12345';
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid if password is too short');

      password = '1234567';
      assert.isFalse(WifiHelper.isValidInput(network_security, password),
        'Input should be invalid if password is too short');

      password = '12345678';
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid if password is long enough');

      password = 'QWERTY123456';
      assert.isTrue(WifiHelper.isValidInput(network_security, password),
        'Input should be valid if password is long enough');
    });

    suite('> WPA-EAP network', function() {
      var password;
      var identity;
      var network_security;
      var eap;

      setup(function() {
        password = '';
        identity = '';
        network_security = '';
        eap = '';
      });

      test('Any input is valid with SIM >', function() {
        network_security = 'WPA-EAP';
        password = '';
        identity = '';
        eap = 'SIM';

        assert.isTrue(WifiHelper.isValidInput(network_security, password,
          identity, eap), 'Any input should be valid with a SIM network');
      });

      test('if password and identify are empty', function() {
        network_security = 'WPA-EAP';
        password = '';
        identity = '';

        assert.isFalse(WifiHelper.isValidInput(network_security, password, 
          identity), 
          'Input should be invalid when password and identity not filled');
      });

      test('if we have password, but no identify', function() {
        network_security = 'WPA-EAP';
        password = '123'; // valid password
        identity = '';

        assert.isFalse(WifiHelper.isValidInput(network_security, password,
          identity), 
          'Input should be invalid when password and identity not filled');
      });

      test('if we have password and identify', function() {
        network_security = 'WPA-EAP';
        password = '123'; // valid password
        identity = 'identification'; // valid identity 

        assert.isTrue(WifiHelper.isValidInput(network_security, password,
          identity), 
          'Input should be valid when password and identity filled');
      });
    });
  });

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
            capabilities: [],
            security: ['WPA-EAP'],
            relSignalStrength: 67,
            connected: false
          },
          {
            ssid: 'Mozilla-Guest',
            bssid: 'xx:xx:xx:xx:xx:xx',
            capabilities: [],
            security: [],
            relSignalStrength: 50,
            connected: false
          },
          {
            ssid: 'Mozilla-Guest',
            bssid: 'xx:xx:xx:xx:xx:xx',
            capabilities: [],
            security: [],
            relSignalStrength: 90,
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
          },
          {
            ssid: 'Another no broadcast',
            bssid: 'xx:xx:xx:xx:xx:xx',
            capabilities: [],
            security: [],
            relSignalStrength: 88,
            connected: false
          },
          {
            ssid: 'Yet another no broadcast',
            bssid: 'xx:xx:xx:xx:xx:xx',
            security: [],
            relSignalStrength: 88,
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
      WifiHelper.wifiManager = function() { return navigator.mozWifiManager;};
    });

    suiteTeardown(function() {
      navigator.mozWifiManager = originalMozWifiManager;
    });

    test('> getNetworks return 2 networks then getKnownNetworks' +
      'return 3 networks successfully', function() {
        var req = WifiHelper.getAvailableAndKnownNetworks();
        var callbackInvokedTimes = 0;
        req.onsuccess = function success() {
          callbackInvokedTimes += 1;
          assert.isTrue(req.result !== null);
          assert.isTrue(req.result.length === 5);
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

    test('> getCapabilities should not return undefined or null', function() {
      var req = WifiHelper.getAvailableAndKnownNetworks();
      req.onsuccess = function success() {
        assert.isTrue(req.result !== null);
        assert.isTrue(req.result.length > 0);
        req.result.forEach(function(network) {
          var capabilities = WifiHelper.getCapabilities(network);
          assert.isTrue(capabilities != null);
        });

      };
      req.onerror = function error() {
        assert.fail();
      };
      triggerCallback('getNetworks', 'onsuccess');
      triggerCallback('getKnownNetworks', 'onsuccess');
    });

    test('> _networksArrayToObject should pick the wifi AP with the strongest' +
      ' signal from wifi APs with same SSID', function() {
        var originalNetworks = fakeDOMRequests.getNetworks.result;
        var noOfMozillaGuestAps = 0;
        originalNetworks.forEach(function(network) {
          if (network.ssid === 'Mozilla-Guest') {
            noOfMozillaGuestAps++;
          }
        });
        assert.isTrue(noOfMozillaGuestAps > 1);

        var networks = WifiHelper._networksArrayToObject(originalNetworks);

        Object.keys(networks).forEach(function(key) {
          if (networks[key].ssid === 'Mozilla-Guest') {
            assert.isTrue(networks[key].relSignalStrength === 90);
          }
        });
      });
  });

});
