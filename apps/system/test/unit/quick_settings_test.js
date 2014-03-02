// Quick Settings Test
'use strict';

require('/test/unit/mock_activity.js');
require('/test/unit/mock_l10n.js');
require('/test/unit/mock_wifi_manager.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');

require('/js/quick_settings.js');

var mocksForQuickSettings = new MocksHelper([
  'MozActivity',
  'SettingsHelper',
  'SettingsListener'
]).init();

suite('quick settings > ', function() {
  var realWifiManager;
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
  });

  suiteTeardown(function() {
    navigator.mozWifiManager = realWifiManager;
    navigator.MozMobileConnection = realMozMobileConnection;
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realSettings;
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
