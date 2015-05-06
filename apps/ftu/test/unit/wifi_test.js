/* global MockL10n, MockMozWifiNetwork, MockNavigatorMozWifiManager,
          MockFxAccountsIACHelper, MocksHelper, UIManager, utils,
          WifiHelper, WifiManager, WifiUI */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

requireApp('ftu/test/unit/mock_utils.js');
requireApp('ftu/test/unit/mock_moz_wifi_network.js');
requireApp('ftu/test/unit/mock_fx_accounts_iac_helper.js');

requireApp('ftu/js/wifi.js');
requireApp('ftu/js/ui.js');
require('/shared/js/wifi_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksHelperForWifi = new MocksHelper([
  'utils',
  'MozWifiNetwork',
  'SettingsListener'
]).init();

suite('wifi > ', function() {
  var realL10n,
      realMozWifiNetwork,
      realMozWifiManager,
      realFxAccountsIACHelper;

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

    realMozWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockNavigatorMozWifiManager;

    realFxAccountsIACHelper = window.FxAccountsIACHelper;
    window.FxAccountsIACHelper = MockFxAccountsIACHelper;

    loadBodyHTML('/index.html');
  });

  setup(function() {
    WifiManager.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;

    window.mozWifiNetwork = realMozWifiNetwork;
    realMozWifiNetwork = null;

    navigator.mozWifiManager = realMozWifiManager;
    realMozWifiManager = null;
  });

  suite('Scan networks >', function() {
    var clock = sinon.useFakeTimers();

    setup(function() {
      this.sinon.spy(utils.overlay, 'show');
    });
    teardown(function() {
      clock.restore();
    });

    test('none available', function(done) {
      var noNetworks = [];
      MockNavigatorMozWifiManager.setNetworks(noNetworks);

      WifiManager.scan(function(networks) {
        assert.ok(utils.overlay.show.calledOnce, 'shows loading overlay');
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
        assert.ok(utils.overlay.show.calledOnce, 'shows loading overlay');
        assert.isDefined(networks, 'return networks');
        assert.isNotNull(networks, 'return valid networks');
        assert.equal(networks, fakeNetworks, 'return existing networks');
        done();
      });
    });

    test('error while scanning', function(done) {
      this.sinon.spy(console, 'error');
      this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks')
        .onFirstCall().returns({
          set onerror(callback) {
            this.error = {
              name: 'error'
            };
            callback();
          }
        });

      WifiManager.scan(function(networks) {
        assert.ok(MockNavigatorMozWifiManager.getNetworks.calledOnce);
        assert.ok(utils.overlay.show.called, 'shows loading overlay');
        assert.equal(networks.length, 0, 'no networks returned');
        assert.ok(console.error.calledOnce);
        done();
      });
    });

    test('should execute callback when scan fails', function() {
      var fakeCallback = this.sinon.spy();

      this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks')
        .onFirstCall().returns({
          set onerror(callback) {
            this.error = {
              name: 'error'
            };
            callback();
          }
        });

      WifiManager.scan(fakeCallback);
      assert.isTrue(fakeCallback.calledOnce);
    });

    test('timeout error', function(done) {
      this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks').returns({});
      this.sinon.spy(console, 'warn');

      WifiManager.scan(function(networks) {
        assert.ok(utils.overlay.show.called, 'shows loading overlay');
        assert.isUndefined(networks, 'no networks returned');
        assert.ok(console.warn.called);
        done();
      });

      clock.tick(10000);
    });
  });

  suite('Choose a network >', function() {
    var network,
        networkDOM,
        fakeEvent;

    setup(function() {
      WifiManager.networks = fakeNetworks;
      WifiUI.renderNetworks(fakeNetworks);
      UIManager.activationScreen =
        document.getElementById('activation-screen');
      UIManager.mainTitle = document.getElementById('main-title');
      UIManager.wifiJoinButton = document.getElementById('wifi-join-button');
      UIManager.navBar = document.getElementById('nav-bar');
      UIManager.passwordInput = document.getElementById('wifi_password');

      network = fakeNetworks[0];
      networkDOM = document.querySelector('li[data-ssid="' +
                                          network.ssid + '"]');
      fakeEvent = {
        target: networkDOM
      };
    });

    teardown(function() {
      UIManager.activationScreen = null;
      UIManager.mainTitle = null;
      UIManager.wifiJoinButton = null;
      UIManager.navBar = null;
      UIManager.passwordInput = null;
    });

    test('Open network', function() {
      this.sinon.stub(WifiHelper, 'isOpen').returns(true);
      this.sinon.stub(WifiUI, 'connect');
      WifiUI.chooseNetwork(fakeEvent);
      assert.isTrue(WifiUI.connect.called, 'should try to connect directly');
    });

    test('Protected network', function() {
      this.sinon.stub(WifiHelper, 'isOpen').returns(false);
      WifiUI.chooseNetwork(fakeEvent);

      assert.equal(UIManager.mainTitle.textContent, networkDOM.dataset.ssid,
          'should show the network name as title');
      assert.isTrue(UIManager.activationScreen.classList.contains('no-options'),
          'should hide refresh button');
      assert.isTrue(UIManager.navBar.classList.contains('secondary-menu'),
          'should change different nav button');
    });

    test('Join button valid input', function() {
      this.sinon.stub(WifiHelper, 'isValidInput').returns(true);

      // default value. Must change after input event
      UIManager.wifiJoinButton.disabled = true;

      UIManager.passwordInput.dispatchEvent(new CustomEvent('input'));
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button should be enabled if the input is valid');
    });

    test('Join button invalid input', function() {
      this.sinon.stub(WifiHelper, 'isValidInput').returns(false);

      // button enabled. Must change after input event
      UIManager.wifiJoinButton.disabled = false;

      UIManager.passwordInput.dispatchEvent(new CustomEvent('input'));
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button should be disabled if the input is not valid');
    });
  });

  suite('Add a hidden network >', function() {
    setup(function() {
      UIManager.init();
      UIManager.activationScreen =
        document.getElementById('activation-screen');
      UIManager.mainTitle = document.getElementById('main-title');
      UIManager.wifiJoinButton = document.getElementById('wifi-join-button');
      UIManager.navBar = document.getElementById('nav-bar');

      UIManager.hiddenWifiSsid = document.getElementById('hidden-wifi-ssid');
      UIManager.hiddenWifiSecurity =
        document.getElementById('hidden-wifi-security');
      UIManager.hiddenWifiPasswordBox =
        document.getElementById('hidden-wifi-password-box');
      UIManager.hiddenWifiPassword =
        document.getElementById('hidden-wifi-password');
      UIManager.hiddenWifiIdentityBox =
        document.getElementById('hidden-wifi-identity-box');
      UIManager.hiddenWifiIdentity =
        document.getElementById('hidden-wifi-identity');

      WifiUI.addHiddenNetwork();
    });

    test('should show authentication screen', function() {
      assert.isTrue(UIManager.activationScreen.classList.contains('no-options'),
          'should hide refresh button');
      assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
          'authentication',
          'should show correct title');
      assert.isTrue(UIManager.navBar.classList.contains('secondary-menu'),
          'should change different nav button');
      assert.equal(UIManager.hiddenWifiSsid.value, '',
          'should clean SSID input');
      assert.equal(UIManager.hiddenWifiPassword.value, '',
          'should clean Password input');
      assert.equal(UIManager.hiddenWifiIdentity.value, '',
          'should clean User input');
      assert.isTrue(UIManager.wifiJoinButton.disabled,
          'should disable Join button by default');
      assert.equal(window.location.hash, '#hidden-wifi-authentication',
          'should update the hash value');
    });

    test('add open network', function() {
      // Check everything is ok when entering
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button should be disabled by default');

      // Choose an Open security and simulate 'change' event
      UIManager.hiddenWifiSecurity.options[0].selected = true;
      UIManager.hiddenWifiSecurity.dispatchEvent(new CustomEvent('change'));

      // Check UI changes for the security chosen
      assert.isTrue(UIManager.hiddenWifiPasswordBox.classList
                    .contains('hidden'),
                    'should hide all security inputs');

      // Prepare the conditions
      UIManager.hiddenWifiSsid.value = 'testSSID';
      // Simulate event for the check
      UIManager.hiddenWifiSsid.dispatchEvent(new CustomEvent('keyup'));
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled when SSID not empty');
    });

    test('add protected network WEP', function() {
      // Check everything is ok when entering
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button should be disabled by default');

      // Choose WEP security and simulate 'change' event
      UIManager.hiddenWifiSecurity.options[1].selected = true;
      UIManager.hiddenWifiSecurity.dispatchEvent(new CustomEvent('change'));

      // Check UI changes for the security chosen
      assert.isFalse(UIManager.hiddenWifiPasswordBox.classList
                    .contains('hidden'),
                    'should show password input');
      assert.isTrue(UIManager.hiddenWifiIdentityBox.classList
                    .contains('hidden'),
                    'should hide user input');


      UIManager.hiddenWifiSsid.value = 'testSSID';
      UIManager.hiddenWifiSsid.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled when SSID not empty');

      UIManager.hiddenWifiPassword.value = 'I234'; // 4 ASCII char
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled when Password is not long enough');

      UIManager.hiddenWifiPassword.value = 'I234S'; // 5 ASCII char
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

      UIManager.hiddenWifiPassword.value = 'I234S67B90'; // 10 ASCII char
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled when not HEX 10 char password');

      UIManager.hiddenWifiPassword.value = '123A567b90'; // 10 HEX char
                                                         // (0-9 A-F a-f)
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

      UIManager.hiddenWifiPassword.value = '1234567890QW'; // 12 ASCII char
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

      UIManager.hiddenWifiPassword.value = '123A567b90QWE'; // 13 ASCII char
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

      UIManager.hiddenWifiPassword.value = '123A567b90QWERTY'; // 16 ASCII char
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');
                                            // 29 ASCII char
      UIManager.hiddenWifiPassword.value = '123A567b90QWERTYUIOPASDFGHJKL';
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

                                            // 32 ASCII char
      UIManager.hiddenWifiPassword.value = '123A567b90QWERTYUIOPASDFGHJKLZXC';
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled with 32 not HEX chars');

                                            // 32 HEX char
      UIManager.hiddenWifiPassword.value = '123A567b90ABCDEFabcdef1234567890';
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

                                            // 58 ASCII char
      UIManager.hiddenWifiPassword.value = '123A567b90' +
                                           'QWERTYUIOPASDFGHJKLZXCVBNM' +
                                           'qwertyuiopasdfghjkl';
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled with 58 not HEX chars');

                                           // 58 HEX char
      UIManager.hiddenWifiPassword.value = '123A567b90ABCDEFabcdef1234567890' +
                                           '1234567890ABCDEFabcdef1234';
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // All conditions valid
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled');

                                           // 59 HEX char
      UIManager.hiddenWifiPassword.value = '123A567b90ABCDEFabcdef1234567890' +
                                           '1234567890ABCDEFabcdef12345';
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled for more than 58 characters');
    });

    test('add protected network WPA-PSK', function() {
      // Check everything is ok when entering
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button should be disabled by default');

      // Choose WPA-PSK security and simulate 'change' event
      UIManager.hiddenWifiSecurity.options[2].selected = true;
      UIManager.hiddenWifiSecurity.dispatchEvent(new CustomEvent('change'));

      // Check UI changes for the security chosen
      assert.isFalse(UIManager.hiddenWifiPasswordBox.classList
                    .contains('hidden'),
                    'should show password input');
      assert.isTrue(UIManager.hiddenWifiIdentityBox.classList
                    .contains('hidden'),
                    'should hide user input');

      UIManager.hiddenWifiSsid.value = 'testSSID';
      UIManager.hiddenWifiSsid.dispatchEvent(new CustomEvent('keyup'));
      // Not enough
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is enabled when SSID not empty');

      UIManager.hiddenWifiPassword.value = 'QW3rtY7'; // 7 char password
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled when Password is not long enough');

      UIManager.hiddenWifiPassword.value = 'QW3rtY78'; // 8 char password
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled when Password is at least 8 char long');

      UIManager.hiddenWifiPassword.value = 'QW3rtY789'; // 8 char password
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with this condition
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled when Password is longer than 8 char');
    });

    test('add protected network WPA-EAP', function() {
      // Check everything is ok when entering
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button should be disabled by default');

      // Choose an Open security and simulate 'change' event
      UIManager.hiddenWifiSecurity.options[3].selected = true;
      UIManager.hiddenWifiSecurity.dispatchEvent(new CustomEvent('change'));

      // Check UI changes for the security chosen
      assert.isFalse(UIManager.hiddenWifiPasswordBox.classList
                    .contains('hidden'),
                    'should show password input');
      assert.isFalse(UIManager.hiddenWifiIdentityBox.classList
                    .contains('hidden'),
                    'should show user input');

      UIManager.hiddenWifiSsid.value = 'testSSID'; // any SSID
      UIManager.hiddenWifiSsid.dispatchEvent(new CustomEvent('keyup'));
      // Not enough
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is enabled when SSID not empty');

      UIManager.hiddenWifiPassword.value = 'QW3rtY'; // any password
      UIManager.hiddenWifiPassword.dispatchEvent(new CustomEvent('keyup'));
      // Not enough with ssid and password filled
      assert.isTrue(UIManager.wifiJoinButton.disabled,
                    'button is disabled when Identity not filled');

      UIManager.hiddenWifiIdentity.value = 'user'; // any user
      UIManager.hiddenWifiIdentity.dispatchEvent(new CustomEvent('keyup'));
      // SSID + User + Password
      assert.isFalse(UIManager.wifiJoinButton.disabled,
                    'button is enabled when all conditions ok');
    });
  });

  suite('Join a network >', function() {
    var testSSID,
        testUser,
        testPassword;

    setup(function() {
      testSSID = 'Mozilla-G';
      testUser = 'testUser';
      testPassword = 'testPassword';

      this.sinon.stub(window.history, 'back');
      this.sinon.stub(WifiManager, 'connect');

      WifiUI.renderNetworks(fakeNetworks);
      UIManager.hiddenWifiSsid =
        document.getElementById('hidden-wifi-ssid');
      UIManager.hiddenWifiIdentity =
        document.getElementById('hidden-wifi-identity');
      UIManager.hiddenWifiPassword =
        document.getElementById('hidden-wifi-password');
      UIManager.hiddenWifiSecurity =
        document.getElementById('hidden-wifi-security');
    });

    teardown(function() {
      // document.body.innerHTML = '';
      UIManager.hiddenWifiSsid = null;
      UIManager.hiddenWifiIdentity = null;
      UIManager.hiddenWifiPassword = null;
      UIManager.hiddenWifiSecurity = null;
    });

    test('from the list of detected networks', function() {
      document.getElementById('wifi_ssid').value = testSSID;
      document.getElementById('wifi_user').value = testUser;
      document.getElementById('wifi_password').value = testPassword;

      WifiUI.joinNetwork();
      assert.isTrue(WifiManager.connect.calledWith(testSSID,
                                                   testPassword,
                                                   testUser),
                    'should try to connect with correct values');
      assert.isTrue(window.history.back.called,
                    'UI should go back to the list');
    });

    test('that is hidden', function() {
      UIManager.hiddenWifiSsid.value = testSSID;
      UIManager.hiddenWifiIdentity.value = testUser;
      UIManager.hiddenWifiPassword.value = testPassword;
      UIManager.hiddenWifiSecurity.options[2].selected = true;

      var oldNetworks = WifiManager.networks.length;

      WifiUI.joinHiddenNetwork();

      var currentNetworks = WifiManager.networks.length;

      assert.isTrue(currentNetworks > oldNetworks,
                    'a new network is added to the list');

      var hiddenNetwork = document.getElementById(testSSID);
      assert.isNotNull(hiddenNetwork, 'hidden network should be rendered');

      assert.isTrue(WifiManager.connect.calledWith(testSSID,
                                                   testPassword,
                                                   testUser),
                    'should try to connect with correct values');
      assert.isTrue(window.history.back.called,
                    'UI should go back to the list');
    });

    suite('Update UI', function() {
      var realWifiManagerOnScan;

      setup(function() {
        WifiUI.renderNetworks(fakeNetworks);
        realWifiManagerOnScan = WifiManager.onScan;
        WifiManager.onScan = null;
      });

      teardown(function() {
        WifiManager.onScan = realWifiManagerOnScan;
      });

      test('Should update the previous connected network', function() {
        var previousNetwork = fakeNetworks[0];
        var currentNetwork = fakeNetworks[1];
        var previousNetworkElement =
          document.querySelector('li[data-ssid="' +
            previousNetwork.ssid + '"]');
        var previousNetworkSecurity =
          previousNetworkElement.querySelector('p[data-security-level]');

        var currentNetworkElement =
          document.querySelector('li[data-ssid="' +
            currentNetwork.ssid + '"]');
        var currentNetworkSecurity =
          currentNetworkElement.querySelector('p[data-security-level]');

        WifiManager.api.onstatuschange({status: 'connected',
          network: previousNetwork});

        assert.isTrue(previousNetworkElement.classList.contains('connected'));
        assert.equal(previousNetworkSecurity.dataset.l10nId,
          'shortStatus-connected');

        WifiManager.api.onstatuschange({status: 'disconnected',
          network: previousNetwork});
        WifiManager.api.onstatuschange({status: 'connected',
          network: currentNetwork});

        assert.isFalse(previousNetworkElement.classList.contains('connected'));
        assert.isTrue(currentNetworkElement.classList.contains('connected'));
        assert.equal(previousNetworkSecurity.dataset.l10nId,
          'securityOpen');
        assert.equal(currentNetworkSecurity.dataset.l10nId,
          'shortStatus-connected');
      });

      test('Should move the current connected network to the top', function() {
        var currentNetwork = fakeNetworks[2];
        var currentNetworkElement =
          document.querySelector('li[data-ssid="' +
            currentNetwork.ssid + '"]');
        var networksList = document.getElementById('networks-list');
        WifiManager.api.onstatuschange({status: 'connected',
          network: currentNetwork});

        var firstChild = networksList.children[0];

        assert.equal(currentNetworkElement, firstChild);
      });
    });
  });
});
