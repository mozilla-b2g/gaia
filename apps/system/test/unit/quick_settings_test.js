// Quick Settings Test
'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
requireApp('system/test/unit/mock_activity.js');

requireApp('system/js/quick_settings.js');

var mocksForQuickSettings = new MocksHelper(['SettingsListener']).init();

suite('quick settings > ', function() {
  var realWifiManager;
  var realSettingsListener;
  var realL10n;
  var realSettings;
  var realMozMobileConnection;
  var realActivity;
  var fakeQuickSettingsNode;

  mocksForQuickSettings.attachTestHelpers();
  suiteSetup(function() {
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
    try {
      realActivity = window.MozActivity;
    }
    catch (e) {
      console.log('Access MozActivity failed, passed realActivity assignment');
    }
    window.MozActivity = MockMozActivity;
  });

  suiteTeardown(function() {
    navigator.mozWifiManager = realWifiManager;
    window.SettingsListener = realSettingsListener;
    navigator.MozMobileConnection = realMozMobileConnection;
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realSettings;
    if (typeof(realActivity) !== 'undefined') {
      window.MozActivity = realActivity;
    }
  });

  setup(function() {
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
});
