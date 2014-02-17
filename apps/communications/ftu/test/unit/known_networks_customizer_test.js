/* global MockNavigatorMozWifiManager */
/* global knownNetworksCustomizer */

'use strict';

requireApp('communications/ftu/js/customizers/customizer.js');
requireApp('communications/ftu/js/customizers/known_networks_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_wifi_manager.js');


suite('Known networks customizer >', function() {

  var realWifiManager;

  suiteSetup(function() {
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockNavigatorMozWifiManager;
  });

  suiteTeardown(function() {
    navigator.mozWifiManager = realWifiManager;
    realWifiManager = null;
  });

  setup(function() {
    navigator.mozWifiManager.mSetup();
  });

  var testCases = [
    {
      'title': 'Wrong Wifi datas ',
      'inputKeysValues': {
        'bad': {
          'bsid': '00:3a:9a:d1:e3:c0'
        }
      },
      'expectResult': []
    },
    {
      'title': 'Wifi without key type ',
      'inputKeysValues': {
        'onlyId': {
          'ssid': 'onlyId'
        }
      },
      'expectResult': [
        {
          'ssid': 'onlyId'
        }
      ]
    },
    {
      'title': 'Existing wifi ',
      'inputKeysValues': {
        'firstWifiAdd': {
          'ssid': 'existing-Wifi',
          'keyType': 'WEP',
          'password': '1234567891234'
        },
        'existing-Wifi': {
          'ssid': 'existing-Wifi',
          'keyType': 'WPA-PSK',
          'password': '123456789'
        }
      },
      'expectResult': [
        {
          'ssid': 'existing-Wifi',
          'keyManagement': 'WEP',
          'security': ['WEP'],
          'capabilities': [],
          'wep': '1234567891234'
        }
      ]
    },
    {
      'title': 'Wifi WEP without key ',
      'inputKeysValues': {
        'wep-without-key': {
          'ssid': 'wep-without-key',
          'keyType': 'WEP'
        }
      },
      'expectResult': [
        {
          'ssid': 'wep-without-key',
          'keyManagement': 'WEP',
          'security': ['WEP'],
          'capabilities': []
        }
      ]
    },
    {
      'title': 'Wifi WEP with wrong key ',
      'inputKeysValues': {
        'wep-wrong-key': {
          'ssid': 'wep-wrong-key',
          'keyType': 'WEP',
          'password': 'wrong1'
        }
      },
      'expectResult': [
        {
          'ssid': 'wep-wrong-key',
          'keyManagement': 'WEP',
          'security': ['WEP'],
          'capabilities': []
        }
      ]
    },
    {
      'title': 'Wifi WEP OK ',
      'inputKeysValues': {
        'wep-ok': {
          'ssid': 'wep-ok',
          'keyType': 'WEP',
          'password': '1234567891234'
        }
      },
      'expectResult': [
        {
          'ssid': 'wep-ok',
          'keyManagement': 'WEP',
          'security': ['WEP'],
          'capabilities': [],
          'wep': '1234567891234'
        }
      ]
    },
    {
      'title': 'Wifi WEP OK with WPS ',
      'inputKeysValues': {
        'wep-ok-wps': {
          'ssid': 'wep-ok-wps',
          'keyType': 'WEP',
          'password': '1234567891234',
          'capabilities': 'WPS'
        }
      },
      'expectResult': [
        {
          'ssid': 'wep-ok-wps',
          'keyManagement': 'WEP',
          'security': ['WEP'],
          'capabilities': ['WPS'],
          'wep': '1234567891234'
        }
      ]
    },
    {
      'title': 'Wifi WPA-PSK without key ',
      'inputKeysValues': {
        'wpa-psk-nokey': {
          'ssid': 'wpa-psk-nokey',
          'keyType': 'WPA-PSK'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-psk-nokey',
          'keyManagement': 'WPA-PSK',
          'security': ['WPA-PSK'],
          'capabilities': []
        }
      ]
    },
    {
      'title': 'Wifi WPA-PSK key OK ',
      'inputKeysValues': {
        'wpa-psk-ok': {
          'ssid': 'wpa-psk-ok',
          'keyType': 'WPA-PSK',
          'password': '123456789'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-psk-ok',
          'keyManagement': 'WPA-PSK',
          'security': ['WPA-PSK'],
          'capabilities': [],
          'psk': '123456789'
        }
      ]
    },
    {
      'title': 'Wifi WPA-PSK wrong key ',
      'inputKeysValues': {
        'wpa-psk-ko-key': {
          'ssid': 'wpa-psk-ko-key',
          'keyType': 'WPA-PSK',
          'password': '1234',
          'capabilities': 'WPS'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-psk-ko-key',
          'keyManagement': 'WPA-PSK',
          'security': ['WPA-PSK'],
          'capabilities': ['WPS']
        }
      ]
    },
    {
      'title': 'Wifi WPA-PSK wrong key ',
      'inputKeysValues': {
        'wpa-psk-ko-key': {
          'ssid': 'wpa-psk-ko-key',
          'keyType': 'WPA-PSK',
          'password': '1234'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-psk-ko-key',
          'keyManagement': 'WPA-PSK',
          'security': ['WPA-PSK'],
          'capabilities': []
        }
      ]
    },
    {
      'title': 'Wifi WPA-EAP without eap ',
      'inputKeysValues': {
        'wpa-eap-no-eap': {
          'ssid': 'wpa-eap-no-eap',
          'keyType': 'WPA-EAP'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-eap-no-eap',
          'keyManagement': 'WPA-EAP',
          'security': ['WPA-EAP'],
          'capabilities': []
        }
      ]
    },
    {
      'title': 'Wifi WPA-EAP wrong eap ',
      'inputKeysValues': {
        'wpa-eap-ko-eap': {
          'ssid': 'wpa-eap-ko-eap',
          'keyType': 'WPA-EAP',
          'eap': 'wrong'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-eap-ko-eap',
          'keyManagement': 'WPA-EAP',
          'security': ['WPA-EAP'],
          'capabilities': [],
          'eap': 'wrong'
        }
      ]
    },
    {
      'title': 'Wifi WPA-EAP eap=SIM ',
      'inputKeysValues': {
        'wpa-eap-sim': {
          'ssid': 'wpa-eap-sim',
          'keyType': 'WPA-EAP',
          'eap': 'SIM'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-eap-sim',
          'keyManagement': 'WPA-EAP',
          'security': ['WPA-EAP'],
          'capabilities': [],
          'eap': 'SIM'
        }
      ]
    },
    {
      'title': 'Wifi WPA-EAP eap ok and not SIM  with key ok ',
      'inputKeysValues': {
        'wpa-eap-peap': {
          'ssid': 'wpa-eap-peap',
          'keyType': 'WPA-EAP',
          'capabilities': 'WPS',
          'eap': 'PEAP',
          'password': '123456789',
          'identity': 'HI\\cjc'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-eap-peap',
          'keyManagement': 'WPA-EAP',
          'security': ['WPA-EAP'],
          'capabilities': ['WPS'],
          'eap': 'PEAP',
          'password': '123456789',
          'identity': 'HI\\cjc'
        }
      ]
    },
    {
      'title': 'Wifi WPA-EAP eap ok and not SIM with phase2 ok ',
      'inputKeysValues': {
        'wpa-eap-peap-phase2': {
          'ssid': 'wpa-eap-peap-phase2',
          'keyType': 'WPA-EAP',
          'capabilities': 'WPS',
          'eap': 'PEAP',
          'password': '123456789',
          'identity': 'HI\\cjc',
          'phase2': 'PAP'
        }
      },
      'expectResult': [
        {
          'ssid': 'wpa-eap-peap-phase2',
          'keyManagement': 'WPA-EAP',
          'security': ['WPA-EAP'],
          'capabilities': ['WPS'],
          'eap': 'PEAP',
          'password': '123456789',
          'identity': 'HI\\cjc',
          'phase2': 'PAP'
        }
      ]
    }
  ];

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      knownNetworksCustomizer.set(testCase.inputKeysValues);
      var knownNet = navigator.mozWifiManager.getKnownNetworks().result;
      assert.deepEqual(knownNet, testCase.expectResult,
                       'Known networks not equals');
    });
  });
});
