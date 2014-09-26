/* global MockNavigatorSettings */
'use strict';
requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp('settings/test/unit/mock_navigator_settings.js');

suite('Hotspot wifi settings >', function() {
  var mockSettingsPanel;
  var panel;
  var realSettings;
  var fakePanel;
  var elements = {};

  var modules = [
    'panels/hotspot_wifi_settings/panel',
    'unit/mock_settings_panel',
    'shared/settings_listener'
  ];

  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    window.Settings = {};
    window.Settings.mozSettings = MockNavigatorSettings;
  });

  setup(function(done) {
    testRequire(modules, map, function(HotspotWifiSettingsPanel,
      MockSettingsPanel) {
        mockSettingsPanel = MockSettingsPanel;
        mockSettingsPanel.mInnerFunction = function(options) {
          var obj = {};
          for (var key in options) {
            obj[key] = options[key];
          }
          return obj;
        };

        panel = HotspotWifiSettingsPanel();
        loadBodyHTML('./_hotspot_wifi_settings.html');
        fakePanel = document.getElementById('hotspot-wifiSettings');

        realSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;

        elements.panel = fakePanel;
        elements.securityTypeSelector =
          fakePanel.querySelector('.security-selector');
        elements.passwordItem = fakePanel.querySelector('.password');
        elements.passwordInput =
          fakePanel.querySelector('input[name="password"]');
        elements.submitBtn = fakePanel.querySelector('button[type="submit"]');
        elements.showPassword =
          fakePanel.querySelector('input[name="show_password"]');
        elements.passwordDesc =
          fakePanel.querySelector('.password-description');
        elements.tethering_ssid =
            fakePanel.querySelector('[data-setting="tethering.wifi.ssid"]');

        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    document.body.html = '';
  });

  suite('onInit', function() {
    var spy;
    setup(function() {
      spy = this.sinon.spy(panel, '_initWifiSettingsDialog');
      panel.onInit(fakePanel);
      panel.onBeforeShow(fakePanel, null);
    });

    test('Panel initialization', function() {
      assert.isTrue(spy.calledWith());
      assert.equal(elements.passwordInput.type, 'password');
      assert.isFalse(elements.submitBtn.checked);
    });

    suite('panel functions', function() {
      setup(function() {
        this.sinon.stub(panel, 'submit');
      });

      test('_updateSubmitButtonState', function() {
        panel._updateSubmitButtonState('wpa2-psk', 62);
        assert.isFalse(elements.submitBtn.disabled);
        panel._updateSubmitButtonState('wpa2-psk', 5);
        assert.isTrue(elements.submitBtn.disabled);
      });

      test('_updatePasswordItemVisibility', function() {
        panel._updatePasswordItemVisibility('wpa2-psk');
        assert.isFalse(elements.passwordItem.hidden);
        assert.isFalse(elements.passwordDesc.hidden);
        panel._updatePasswordItemVisibility('open');
        assert.isTrue(elements.passwordItem.hidden);
        assert.isTrue(elements.passwordDesc.hidden);
      });

      test('reset', function() {
        assert.equal(elements.passwordInput.value, '');

        var cset = {};
        cset[panel._thetheringPasswordKey] = 'password-test';
        cset[panel._thetheringSecurityKey] = 'wpa2-psk';
        cset['tethering.wifi.ssid'] = 'SSID test';
        navigator.mozSettings.createLock().set(cset);
        Promise.resolve(panel.reset()).then(function() {
          assert.equal(elements.passwordInput.value, 'password-test');
          assert.equal(elements.securityTypeSelector.value, 'wpa2-psk');
          assert.equal(elements.tethering_ssid.value, 'SSID test');
        });
      });

      test.skip('submit', function() {
        elements.submitBtn.click();
        assert.isTrue(panel.submit.calledWith());
      });
    });
  });
});
