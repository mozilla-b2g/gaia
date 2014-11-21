'use strict';

requireApp('ftu/test/unit/mock_utils.js');
requireApp('ftu/test/unit/mock_wifi_helper.js');
requireApp('ftu/test/unit/mock_ui_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('ftu/test/unit/mock_moz_wifi_network.js');
requireApp('ftu/test/unit/mock_wifi.html.js');

requireApp('ftu/js/wifi.js');
requireApp('ftu/js/ui.js');

var mocksHelperForWifi = new MocksHelper([
  'utils',
  'WifiHelper',
  'MozWifiNetwork',
  'UIManager'
]).init();

suite('wifi > ', function() {
  var realL10n, realMozWifiNetwork, realHTML;

  var fakeNetworks = [
      {
        ssid: 'Mozilla Guest',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: [],
        capabilities: [],
        relSignalStrength: 98,
        connected: false
      },
      {
        ssid: 'Livebox 6752',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: ['WEP'],
        capabilities: [],
        relSignalStrength: 89,
        connected: false
      },
      {
        ssid: 'Mozilla-G',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: ['WPA-EAP'],
        capabilities: [],
        relSignalStrength: 67,
        connected: false
      },
      {
        ssid: 'Freebox 8953',
        bssid: 'xx:xx:xx:xx:xx:xx',
        security: ['WPA2-PSK'],
        capabilities: [],
        relSignalStrength: 32,
        connected: false
      }
    ];

  mocksHelperForWifi.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozWifiNetwork = window.mozWifiNetwork;
    window.mozWifiNetwork = MockMozWifiNetwork;
  });

  setup(function() {
    WifiManager.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
    window.mozWifiNetwork = realMozWifiNetwork;
    realMozWifiNetwork = null;
  });

  suite('scan networks', function() {
    var showOverlayStub;
    var clock = sinon.useFakeTimers();

    setup(function() {
      showOverlayStub = this.sinon.spy(utils.overlay, 'show');
    });

    test('none available', function(done) {
      var noNetworks = [];
      MockNavigatorMozWifiManager.setNetworks(noNetworks);
      WifiManager.scan(function(networks) {
        assert.ok(showOverlayStub.calledOnce, 'shows loading overlay');
        assert.equal(networks.length, noNetworks.length,
          'return zero networks');
        assert.isDefined(document.getElementById('no-result-container'),
          'show no networks message');
        done();
      });
    });

    test('some available', function(done) {
      MockNavigatorMozWifiManager.setNetworks(fakeNetworks);
      WifiManager.scan(function(networks) {
        assert.ok(showOverlayStub.calledOnce, 'shows loading overlay');
        assert.isDefined(networks, 'return networks');
        assert.isNotNull(networks, 'return valid networks');
        assert.equal(networks, fakeNetworks, 'return existing networks');
        done();
      });
    });

    test('error while scanning', function(done) {
      var consoleSpy = this.sinon.spy(console, 'error');
      var stub = this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks');
      stub.onFirstCall().returns(
        {
          set onerror(callback) {
            this.error = {
              name: 'error'
            };
            callback();
          }
        }
      );

      stub.onSecondCall().returns(
        {
          set onsuccess(callback) {
            this.result = fakeNetworks;
            callback();
          }
        }
      );

      WifiManager.scan(function(networks) {
        assert.ok(stub.calledTwice);
        assert.ok(showOverlayStub.called, 'shows loading overlay');
        assert.isDefined(networks, 'networks eventually returned');
        assert.ok(consoleSpy.calledOnce);
        done();
      });

      //simulate a status change
      WifiManager.api.onstatuschange({status: 'disconnected'});
    });

    test('timeout error', function(done) {
      var consoleSpy = this.sinon.spy(console, 'warn');
      var stub = this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks',
        function() {
          return {};
      });
      WifiManager.scan(function(networks) {
        assert.ok(showOverlayStub.called, 'shows loading overlay');
        assert.isUndefined(networks, 'no networks returned');
        assert.ok(consoleSpy.calledOnce);
        done();
      });
      clock.tick(10000);
    });
  });

  suite('Join networks', function() {
    var connectStub;
    setup(function() {
      connectStub = this.sinon.stub(WifiUI, 'connect',
        function(ssid, password, user) {
          return;
      });
      realHTML = document.body.innerHTML;
      document.body.innerHTML = MockImportWifiHTML;
    });

    test('Should join to a wifi network', function() {
      var password =
        document.getElementById('wifi_password');
      var ssid = document.getElementById('wifi_ssid');
      var user = document.getElementById('wifi_user');

      ssid.value = 'testSSID';
      password.value = 'testPassword';

      WifiUI.joinNetwork();
      assert.isTrue(connectStub.called, 'WifiUI.connect should be called');
    });

    test('Should creates a hidden network', function() {
      UIManager.hiddenWifiPassword =
        document.getElementById('hidden-wifi-password');
      UIManager.hiddenWifiIdentity =
        document.getElementById('hidden-wifi-identity');
      UIManager.hiddenWifiSsid = document.getElementById('wifi_ssid');
      UIManager.hiddenWifiSecurity =
        document.getElementById('hidden-wifi-security');

      UIManager.hiddenWifiSsid.value = 'testSSID';
      UIManager.hiddenWifiPassword.value = 'testPassword';
      UIManager.hiddenWifiSecurity.options[2].selected = true;

      var oldNetworks = WifiManager.networks.length;

      WifiUI.joinHiddenNetwork();

      var currentNetworks = WifiManager.networks.length;

      assert.isTrue(currentNetworks > oldNetworks);

      var hiddenNetwork = document.querySelector('#testSSID');
      assert.isNotNull(hiddenNetwork, 'hidden network should be rendered');
    });
  });

  suite('Choose networks', function() {
    setup(function() {
      WifiUI.renderNetworks(fakeNetworks);
      UIManager.activationScreen =
        document.getElementById('activation-screen');
      UIManager.mainTitle = document.getElementById('main-title');
      UIManager.wifiJoinButton = document.getElementById('wifi-join-button');
    });

    teardown(function() {
      UIManager.activationScreen = null;
      UIManager.mainTitle = null;
      UIManager.wifiJoinButton = null;
    });

    test('Should set header properly', function() {
      var network = document.querySelector('li[data-ssid="Mozilla Guest"]');

      var header = UIManager.mainTitle;
      var event = {
        target: network.querySelector('p')
      };

      WifiUI.chooseNetwork(event);
      assert.equal(header.textContent, network.dataset.ssid);
      assert.isTrue(UIManager.activationScreen.
        classList.contains('no-options'));
    });
  });
});
