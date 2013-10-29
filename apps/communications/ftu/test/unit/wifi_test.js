'use strict';

requireApp('communications/ftu/test/unit/mock_l10n.js');
requireApp('communications/ftu/test/unit/mock_utils.js');
requireApp('communications/ftu/test/unit/mock_wifi_helper.js');
requireApp(
  'communications/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('communications/ftu/js/wifi.js');

var _;
var mocksHelperForWifi = new MocksHelper([
  'utils',
  'WifiHelper'
]).init();

suite('wifi > ', function() {
  var realL10n;

  var networksDOM;
  var fakeNetworks = [
      {
        ssid: 'Mozilla Guest',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: [],
        relSignalStrength: 98,
        connected: false
      },
      {
        ssid: 'Livebox 6752',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: ['WEP'],
        relSignalStrength: 89,
        connected: false
      },
      {
        ssid: 'Mozilla-G',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: ['WPA-EAP'],
        relSignalStrength: 67,
        connected: false
      },
      {
        ssid: 'Freebox 8953',
        bssid: 'xx:xx:xx:xx:xx:xx',
        capabilities: ['WPA2-PSK'],
        relSignalStrength: 32,
        connected: false
      }
    ];

  function createDOM() {
    var markup =
    '<ol id="progress-bar" class="step-state"></ol>' +
    '<section id="activation-screen">' +
    ' <header>' +
    '  <h1 id="main-title"></h1>' +
    ' </header>' +
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
    '      <input type="password" id="wifi_password"></input>' +
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
    '      <input type="password" id="hidden-wifi-password" />' +
    '      <label id="label_show_password">' +
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

    container = document.createElement('div');
    container.insertAdjacentHTML('beforeend', markup);
    document.body.appendChild(container);
  }

  mocksHelperForWifi.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  setup(function() {
    WifiManager.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  suite('scan networks', function() {
    var showOverlayStub;

    setup(function() {
      showOverlayStub = this.sinon.spy(utils.overlay, 'show');
    });

    test('none available', function(done) {
      WifiManager.scan(function(networks) {
        assert.ok(showOverlayStub.calledOnce, 'shows loading overlay');
        assert.isUndefined(networks, 'return zero networks');
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
      var stub = this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks',
        function() {
          return {
            set onerror(callback) {
              this.error = {
                name: 'error'
              };
              callback();
            }
          };
        }
      );
      WifiManager.scan(function(networks) {
        assert.ok(showOverlayStub.calledOnce, 'shows loading overlay');
        assert.isUndefined(networks, 'no networks returned');
        assert.ok(consoleSpy.calledOnce);
        done();
      });
    });

    test('timeout error', function(done) {
      var clock = this.sinon.useFakeTimers();
      var consoleSpy = this.sinon.spy(console, 'warn');
      var stub = this.sinon.stub(MockNavigatorMozWifiManager, 'getNetworks',
        function() {
          return {};
      });
      WifiManager.scan(function(networks) {
        assert.ok(showOverlayStub.calledOnce, 'shows loading overlay');
        assert.isUndefined(networks, 'no networks returned');
        assert.ok(consoleSpy.calledOnce);
        done();
      });
      clock.tick(10000);
    });
  });

});
