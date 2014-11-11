'use strict';

requireApp('ftu/test/unit/mock_utils.js');
requireApp('ftu/test/unit/mock_wifi_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('ftu/test/unit/mock_moz_wifi_network.js');

requireApp('ftu/js/wifi.js');
requireApp('ftu/js/ui.js');

var mocksHelperForWifi = new MocksHelper([
  'utils',
  'WifiHelper',
  'MozWifiNetwork'
]).init();

suite('wifi > ', function() {
  var realL10n, realMozWifiNetwork;

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

  function createDOM() {
    var markup =
    '<section id="activation-screen">' +
    ' <gaia-header>' +
    '  <h1 id="main-title"></h1>' +
    ' </gaia-header>' +
    ' <section id="wifi">' +
    '  <div id="wifi-wrapper">' +
    '    <article id="networks">' +
    '    </article>' +
    '    <button id="join-hidden-button">' +
    '      Join hidden network' +
    '    </button>' +
    '  </div>' +
    ' </section>' +
    ' <section id="configure_network">' +
    '  <section id="configure_network_params">' +
    '    <form>' +
    '      <input type="text" id="wifi_ssid" class="hidden"></input>' +
    '      <label id="label_wifi_user">User</label>' +
    '      <input type="text" id="wifi_user"></input>' +
    '      <label>Password</label>' +
    '      <input type="password" id="wifi_password" maxlength="63"></input>' +
    '      <label id="label_show_password">' +
    '        <input type="checkbox" data-ignore name="show_password" />' +
    '        <span></span>' +
    '        <p id="wifi_show_password">Show Password</p>' +
    '      </label>' +
    '    </form>' +
    '  </section>' +
    ' </section>' +
    ' <section id="hidden-wifi-authentication">' +
    '  <div>' +
    '    <form>' +
    '      <label id="label_wifi_ssid">' +
    '        SSID Network Name' +
    '      </label>' +
    '      <input type="text" name="wifi_ssid" id="hidden-wifi-ssid"/>' +
    '      <label id="label_wifi_security">' +
    '        Security' +
    '      </label>' +
    '      <select id="hidden-wifi-security">' +
    '        <option>none</option>' +
    '        <option>WEP</option>' +
    '        <option>WPA-PSK</option>' +
    '        <option>WPA-EAP</option>' +
    '      </select>' +
    '      <div class="hidden" id="hidden-wifi-identity-box">' +
    '        <label id="label_wifi_identity">' +
    '          Identity' +
    '        </label>' +
    '        <input type="text" id="hidden-wifi-identity"/>' +
    '      </div>' +
    '      <label id="label_hidden_wifi_password">' +
    '        Password' +
    '      </label>' +
    '      <input type="password" id="hidden-wifi-password" maxlength="63" />' +
    '      <label id="label_hidden_show_password">' +
    '        <input type="checkbox" id="hidden-wifi-show-password" />' +
    '        <span></span>' +
    '        <p>Show Password</p>' +
    '      </label>' +
    '    </form>' +
    '  </div>' +
    ' </section>' +
    ' <menu id="nav-bar">' +
    '   <button id="back">Back</button>' +
    '   <button id="forward">Next</button>' +
    '   <button id="wifi-join-button">Join</button>' +
    '   <button id="unlock-sim-button">Send</button>' +
    '   <button id="skip-pin-button">Skip</button>' +
    ' </menu>' +
    '</section>';

    var container = document.createElement('div');
    container.insertAdjacentHTML('beforeend', markup);
    document.body.appendChild(container);
  }

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
      createDOM();
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
});
