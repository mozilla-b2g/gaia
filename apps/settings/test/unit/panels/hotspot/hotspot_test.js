/* global SettingsListener */
'use strict';

suite('Hotspot panel >', function() {
  var hotspot;
  var realMozSettings;

  var modules = [
    'panels/hotspot/hotspot',
    'shared_mocks/mock_navigator_moz_settings',
    'shared_mocks/mock_settings_listener',
  ];

  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/settings_cache': 'unit/mock_settings_cache'
    }
  };

  setup(function(done) {
    testRequire(modules, maps, function(
      Hotspot, MockNavigatorSettings, MockSettingsListener) {
        window.SettingsListener = MockSettingsListener;
        // mock mozSettings
        realMozSettings = navigator.mozSettings;
        window.navigator.mozSettings = MockNavigatorSettings;
        hotspot = Hotspot();
        done();
    });
  });

  teardown(function() {
    window.navigator.mozSettings = realMozSettings;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.spy(SettingsListener, 'observe');
      hotspot.init();
    });

    test('we should observe settings', function() {
      assert.equal(SettingsListener.observe.callCount, 3);
      assert.ok(SettingsListener.observe.getCall(0).calledWith(
        hotspot.tetheringWifiKey, false),
        'should observe hotspot wifi setting');
      assert.ok(SettingsListener.observe.getCall(1).calledWith(
        hotspot.tetheringUsbKey, false),
        'should observe hotspot usb setting');
      assert.ok(SettingsListener.observe.getCall(2).calledWith(
        hotspot.usbStorageKey, false),
        'should observe usb storage setting');
    });
  });

  suite('hotspot settings changes and listeners', function() {
    var fakeCallback;
    setup(function() {
      fakeCallback = this.sinon.spy();
    });

    test('we should notify every listener when property changes', function() {
      hotspot.addEventListener('wifiHotspotChange', fakeCallback);
      hotspot._hotspotSettingChange(false);
      assert.ok(fakeCallback.calledWith(false),
        'should notify the new value of wifi hotspot');
      assert.isFalse(hotspot._hotspotSetting);

      hotspot.addEventListener('usbHotspotChange', fakeCallback);
      hotspot._usbHotspotSettingChange(false);
      assert.ok(fakeCallback.calledWith(false),
        'should notify the new value of usb tethering');
      assert.isFalse(hotspot._usbHotspotSetting);

      hotspot.addEventListener('usbStorageChange', fakeCallback);
      hotspot._usbStorageSettingChange(false);
      assert.ok(fakeCallback.calledWith(false),
        'should notify the new value of usb storage');
      assert.isFalse(hotspot._usbStorageSetting);

      hotspot.addEventListener('incompatibleSettings', fakeCallback);
      hotspot._incompatibleSettings(
        hotspot.tetheringUsbKey, hotspot.tetheringWifiKey, false);
      assert.ok(fakeCallback.calledWith(
        hotspot.tetheringUsbKey, hotspot.tetheringWifiKey, false),
          'should notify a conflict with the settings');
    });

    test('we should add and remove listeners correctly', function() {
      hotspot.addEventListener('wifiHotspotChange', fakeCallback);
      assert.equal(hotspot._hotspotChangeListeners.length, 1);

      hotspot.removeEventListener('wifiHotspotChange', fakeCallback);
      assert.equal(hotspot._hotspotChangeListeners.length, 0);

      hotspot.addEventListener('usbHotspotChange', fakeCallback);
      assert.equal(hotspot._usbHotspotChangeListeners.length, 1);

      hotspot.removeEventListener('usbHotspotChange', fakeCallback);
      assert.equal(hotspot._usbHotspotChangeListeners.length, 0);

      hotspot.addEventListener('incompatibleSettings', fakeCallback);
      assert.equal(hotspot._incompatibleSettingsListeners.length, 1);

      hotspot.removeEventListener('incompatibleSettings', fakeCallback);
      assert.equal(hotspot._incompatibleSettingsListeners.length, 0);

      hotspot.addEventListener('usbStorageChange', fakeCallback);
      assert.equal(hotspot._usbStorageChangeListeners.length, 1);

      hotspot.removeEventListener('usbStorageChange', fakeCallback);
      assert.equal(hotspot._usbStorageChangeListeners.length, 0);
    });
  });

  suite('Incompatible settings', function() {
    setup(function() {
      hotspot._hotspotSetting = false;
      hotspot._usbHotspotSetting = false;
      hotspot._usbStorageSetting = false;
    });

    test('Wifi hotspot, No incompatible settings', function() {
      var spy = this.sinon.spy(hotspot, '_setWifiTetheringSetting');
      hotspot.checkIncompatibleSettings(hotspot.tetheringWifiKey, false);

      assert.ok(spy.calledWith(false));

      hotspot.checkIncompatibleSettings(hotspot.tetheringWifiKey, true);
      assert.ok(spy.calledWith(true));
    });

    test('Wifi hotspot, Incompatible settings', function() {
      var spy = this.sinon.spy(hotspot, '_incompatibleSettings');
      hotspot._usbHotspotSetting = true;

      hotspot.checkIncompatibleSettings(hotspot.tetheringWifiKey, true);
      assert.ok(spy.calledWith(
        hotspot.tetheringWifiKey, hotspot.tetheringUsbKey, false),
          'should call _incompatibleSettings');
    });

    test('USB hotspot, No incompatible settings', function() {
      var spy = this.sinon.spy(hotspot, '_setUsbTetheringSetting');

      hotspot.checkIncompatibleSettings(hotspot.tetheringUsbKey, false);
      assert.ok(spy.calledWith(false));

      hotspot.checkIncompatibleSettings(hotspot.tetheringUsbKey, true);
      assert.ok(spy.calledWith(true));
    });

    test('USB hotspot, Incompatible settings, USB storage enabled',
      function() {
        var spy = this.sinon.spy(hotspot, '_incompatibleSettings');
        hotspot._usbStorageSetting = true;

        hotspot.checkIncompatibleSettings(hotspot.tetheringUsbKey, true);
        assert.ok(spy.calledWith(
          hotspot.tetheringUsbKey, hotspot.usbStorageKey, false));
    });

    test('USB hotspot, Incompatible settings, Wifi hotspot enabled',
      function() {
        var spy = this.sinon.spy(hotspot, '_incompatibleSettings');
        hotspot._hotspotSetting = true;

        hotspot.checkIncompatibleSettings(hotspot.tetheringUsbKey, true);
        assert.ok(spy.calledWith(
          hotspot.tetheringUsbKey, hotspot.tetheringWifiKey, false));
    });

    test('USB hotspot, Incompatible settings, both enabled',
      function() {
        var spy = this.sinon.spy(hotspot, '_incompatibleSettings');
        hotspot._hotspotSetting = true;
        hotspot._usbStorageSetting = true;

        hotspot.checkIncompatibleSettings(hotspot.tetheringUsbKey, true);
        assert.ok(spy.calledWith(hotspot.tetheringUsbKey, null, true));
    });
  });
});
