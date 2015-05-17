/* global MockNavigatorSettings */
'use strict';

suite('Hotspot settings panel >', function() {
  var hotspotSettings;
  var realMozSettings;
  var realSettingsListener;
  var mockSettingsListener;

  var modules = [
    'panels/hotspot/hotspot_settings',
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
      HotspotSettings, MockNavigatorSettings, MockSettingsListener) {
        realSettingsListener = window.SettingsListener;
        window.SettingsListener = MockSettingsListener;
        mockSettingsListener = MockSettingsListener;
        // mock mozSettings
        realMozSettings = navigator.mozSettings;
        window.navigator.mozSettings = MockNavigatorSettings;
        hotspotSettings = HotspotSettings();
        done();
    });
  });

  teardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
  });

  suite('Update settings values', function() {
    setup(function() {
        hotspotSettings.hotspotSSID = '';
        hotspotSettings.hotspotSecurity = '';
        hotspotSettings.hotspotPassword = '';
    });

    test('Should reflect the SSID setting change', function() {
      var fakeCb = this.sinon.spy();
      hotspotSettings.observe('hotspotSSID', fakeCb);

      hotspotSettings.setHotspotSSID('testSSID');
      mockSettingsListener.mTriggerCallback('tethering.wifi.ssid', 'testSSID');

      assert.isTrue(fakeCb.calledWith('testSSID'));
    });

    test('Should reflect the Hotspot Security setting change', function() {
      var fakeCb = this.sinon.spy();
      hotspotSettings.observe('hotspotSecurity', fakeCb);

      hotspotSettings.setHotspotSSID('hotspotSecurity');
      mockSettingsListener.mTriggerCallback('tethering.wifi.security.type',
        'open');

      assert.isTrue(fakeCb.calledWith('open'));
    });

    test('Should reflect the Hotspot Password setting change', function() {
      var fakeCb = this.sinon.spy();
      hotspotSettings.observe('hotspotPassword', fakeCb);

      hotspotSettings.setHotspotSSID('hotspotPassword');
      mockSettingsListener.mTriggerCallback('tethering.wifi.security.password',
        'testPassword');

      assert.isTrue(fakeCb.calledWith('testPassword'));
    });
  });

  suite('Generate password', function() {
    var setting = 'tethering.wifi.security.password';
    var settingSSID = 'tethering.wifi.ssid';

    setup(function() {
      var cset = [];
      cset[setting] = undefined;
      MockNavigatorSettings.mSet(cset);
    });

    test('Hotspot password should be generate correctly', function() {
        var re = new RegExp('^[a-z]+[0-9]{4}');
        hotspotSettings._updatePasswordIfNeeded();
        var generatedPassword = MockNavigatorSettings.mSettings[setting];
        assert.isTrue(re.test(generatedPassword));
    });

    test('SSID should be generate correctly', function() {
      var re = new RegExp('FirefoxOS_[a-zA-Z0-9]{10}');
      hotspotSettings._updateSSIDIfNeeded();
      var generatedSSID = MockNavigatorSettings.mSettings[settingSSID];
      assert.isTrue(re.test(generatedSSID));
    });
  });
});
