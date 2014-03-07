// Quick Settings Test
'use strict';

require('/test/unit/mock_activity.js');
require('/test/unit/mock_l10n.js');
require('/test/unit/mock_wifi_manager.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

require('/js/quick_settings.js');

var mocksForQuickSettings = new MocksHelper([
  'MozActivity',
  'SettingsHelper',
  'SettingsListener',
  'NavigatorMozMobileConnections'
]).init();

suite('quick settings > ', function() {
  var realWifiManager;
  var realL10n;
  var realSettings;
  var realMozMobileConnections;
  var fakeQuickSettingsNode;

  mocksForQuickSettings.attachTestHelpers();

  suiteSetup(function() {
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    navigator.mozWifiManager = realWifiManager;
    navigator.MozMobileConnections = realMozMobileConnections;
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realSettings;
  });

  setup(function() {
    MockNavigatorMozMobileConnections.mAddMobileConnection();

    fakeQuickSettingsNode = document.createElement('div');
    fakeQuickSettingsNode.id = 'quick-settings';
    document.body.appendChild(fakeQuickSettingsNode);

    QuickSettings.ELEMENTS.forEach(function testAddElement(elementName) {
      var elt = document.createElement('div');
      elt.id = 'quick-settings-' + elementName;
      fakeQuickSettingsNode.appendChild(elt);
    });
    QuickSettings.init();
  });

  teardown(function() {
    fakeQuickSettingsNode.parentNode.removeChild(fakeQuickSettingsNode);
  });

  test('system/quick settings/enable wifi: Connected', function() {
    MockWifiManager.connection.status = 'connected';
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    QuickSettings.handleEvent({
      type: 'wifi-statuschange',
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], true);
  });

  test('system/quick settings/enable wifi: Connecting failed', function() {
    MockWifiManager.connection.status = 'connectingfailed';
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    QuickSettings.handleEvent({
      type: 'wifi-statuschange',
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], false);
  });

  test('system/quick settings/enable wifi: Disconnected', function() {
    MockWifiManager.connection.status = 'disconnected';
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    QuickSettings.handleEvent({
      type: 'wifi-statuschange',
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], false);
  });

  test('system/quick settings/disable wifi', function() {
    MockSettingsListener.mCallbacks['wifi.enabled'](true);
    QuickSettings.handleEvent({
      type: 'click',
      target: QuickSettings.wifi,
      preventDefault: function() {}
    });
    assert.equal(
      MockNavigatorSettings.mSettings['wifi.connect_via_settings'], false);
  });

  suite('datachange > ', function() {
    var label = {
      'lte': '4G', // 4G LTE
      'ehrpd': '4G', // 4G CDMA
      'hspa+': 'H+', // 3.5G HSPA+
      'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
      // 3G CDMA
      'evdo0': '3G', 'evdoa': '3G', 'evdob': '3G', '1xrtt': '3G',
      'umts': '3G', // 3G
      'edge': 'E', // EDGE
      'is95a': '2G', 'is95b': '2G', // 2G CDMA
      'gprs': '2G'
    };

    function setDataTypeOnConn(index, value) {
      MockNavigatorMozMobileConnections[index].data = {};
      MockNavigatorMozMobileConnections[index].data.type = value;
    }

    suite('one sim has data but the other one doesn\'t', function() {
      setup(function() {
        setDataTypeOnConn(0, 'umts');
        setDataTypeOnConn(1, undefined);
        MockNavigatorMozMobileConnections[0]
          .triggerEventListeners('datachange');
      });

      test('we would get 3G label', function() {
        assert.equal(QuickSettings.data.dataset.network, label['umts']);
      });
    });

    suite('no sim has data', function() {
      setup(function() {
        setDataTypeOnConn(0, undefined);
        setDataTypeOnConn(1, undefined);
        MockNavigatorMozMobileConnections[0]
          .triggerEventListeners('datachange');
      });

      test('we would get undefined label', function() {
        assert.equal(QuickSettings.data.dataset.network, label[undefined] + '');
      });
    });
  });
});
