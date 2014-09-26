/* global MockNavigatorSettings */
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

mocha.globals(['Settings']);

suite('HotspotContext', function() {
  'use strict';

  var realSettings;
  var hotspotContext;
  var settingsListener;
  var settingsCache;
  var map = {
    '*': {
      'modules/settings_cache': 'unit/mock_settings_cache',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  var mockSettingsCache = {
    'tethering.usb.enabled': false,
    'tethering.wifi.enabled': true,
    'ums.enabled': false
  };

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    window.Settings = {};
    window.Settings.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
  });

  setup(function(done) {
    testRequire([
      'modules/hotspot_context',
      'shared/settings_listener',
      'modules/settings_cache'
    ], map, function(HotspotContext, MockSettingsListener, MockSettingsCache) {
      hotspotContext = HotspotContext;
      settingsListener = MockSettingsListener;
      settingsCache = MockSettingsCache;
      MockNavigatorSettings.mSetup();
      done();
    });
  });

  suite('WifiHotspotChange', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      hotspotContext.addEventListener('wifiHotspotChange', fakeCb);
    });

    teardown(function() {
      hotspotContext.removeEventListener('wifiHotspotChange', fakeCb);
    });

    test('when wifi hotspot setting changes, trigger cb', function() {
      settingsListener.mTriggerCallback('tethering.wifi.enabled', true);
      assert.isTrue(fakeCb.calledWith(true));
    });
  });

  suite('UsbHotspotChange', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      hotspotContext.addEventListener('usbHotspotChange', fakeCb);
    });

    teardown(function() {
      hotspotContext.removeEventListener('usbHotspotChange', fakeCb);
    });

    test('when usb hotspot setting changes, trigger cb', function() {
      settingsListener.mTriggerCallback('tethering.usb.enabled', true);
      assert.isTrue(fakeCb.calledWith(true));
    });
  });

  suite('SecurityTypeChange', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      hotspotContext.addEventListener('securityTypeChange', fakeCb);
    });

    teardown(function() {
      hotspotContext.removeEventListener('securityTypeChange', fakeCb);
    });

    test('when hotspot security type setting changes, trigger cb', function() {
      settingsListener.mTriggerCallback('tethering.wifi.security.type', 'open');
      assert.isTrue(fakeCb.calledWith('open'));
    });
  });

  suite('setMozSetting', function() {
    test('wifi hotspot setting must change', function() {
      hotspotContext.setMozSetting('tethering.wifi.enabled', false);
      var setting =
        window.navigator.mozSettings.createLock().get('tethering.wifi.enabled');

      assert.isFalse(setting.result['tethering.wifi.enabled']);
    });

    test('usb hotspot setting must change', function() {
      hotspotContext.setMozSetting('tethering.usb.enabled', false);
      var setting =
        window.navigator.mozSettings.createLock().get('tethering.usb.enabled');

      assert.isFalse(setting.result['tethering.usb.enabled']);
    });
  });

  suite('checkIncompatibleSettings', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      hotspotContext.addEventListener('incompatibleSettings', fakeCb);
    });

    teardown(function() {
      hotspotContext.removeEventListener('incompatibleSettings', fakeCb);
    });

    test('Usb tethering: two incompatible settings, trigger cb', function() {
      settingsCache.mockSettings(mockSettingsCache);
      // We must trigger this callback to update the cache settings
      settingsListener.mTriggerCallback('tethering.wifi.enabled', true);
      hotspotContext.checkIncompatibleSettings('tethering.usb.enabled', true);

      assert.isTrue(fakeCb.calledWith('tethering.usb.enabled',
        'tethering.wifi.enabled', false));
    });

    test('Usb tethering: Usb storage and wifi hotspot enabled', function() {
      mockSettingsCache['ums.enabled'] = true;
      settingsCache.mockSettings(mockSettingsCache);
      // We must trigger this callback to update the cache settings
      settingsListener.mTriggerCallback('tethering.wifi.enabled', true);
      hotspotContext.checkIncompatibleSettings('tethering.usb.enabled', true);

      assert.isTrue(fakeCb.calledWith('tethering.usb.enabled',
        null, true));
    });

    test('Usb tethering: disable setting, not trigger cb', function() {
      settingsCache.mockSettings(mockSettingsCache);
      // We must trigger this callback to update the cache settings
      settingsListener.mTriggerCallback('tethering.wifi.enabled', true);
      hotspotContext.checkIncompatibleSettings('tethering.usb.enabled', false);

      assert.isFalse(fakeCb.called);
    });

    test('Wifi tethering: two incompatible settings, trigger cb', function() {
      mockSettingsCache['tethering.wifi.enabled'] = false;
      mockSettingsCache['tethering.usb.enabled'] = true;
      settingsCache.mockSettings(mockSettingsCache);
      // We must trigger this callback to update the cache settings
      settingsListener.mTriggerCallback('tethering.wifi.enabled', false);
      hotspotContext.checkIncompatibleSettings('tethering.wifi.enabled', true);

      assert.isTrue(fakeCb.calledWith('tethering.wifi.enabled',
        'tethering.usb.enabled', false));
    });

    test('Wifi tethering: disable setting, not trigger cb', function() {
      mockSettingsCache['tethering.wifi.enabled'] = false;
      mockSettingsCache['tethering.usb.enabled'] = true;
      settingsCache.mockSettings(mockSettingsCache);
      // We must trigger this callback to update the cache settings
      settingsListener.mTriggerCallback('tethering.wifi.enabled', false);
      hotspotContext.checkIncompatibleSettings('tethering.wifi.enabled', false);

      assert.isFalse(fakeCb.called);
    });
  });

  suite('Generate password', function() {
    test('password is correctly generated', function() {
      var setting = 'tethering.wifi.security.password';
      var re = new RegExp('[a-z]+[0-9]{4}');
      var generatedPassword = navigator.mozSettings.mSettings[setting];
      assert.isTrue(re.test(generatedPassword));
    });
  });
});
