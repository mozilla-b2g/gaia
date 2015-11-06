/* global loadBodyHTML, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('RootPanel', function() {
  var realSettings;
  var realMobileConnections;
  var panel;
  var MockAirplaneModeItem;

  var modules = [
    'panels/root/panel',
    'shared_mocks/mock_navigator_moz_settings'
  ];
  var map = {
    '*': {
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/root/root': 'MockRoot',
      'panels/root/airplane_mode_item': 'MockAirplaneModeItem',
      'panels/root/themes_item': 'MockThemesItem',
      'panels/root/addons_item': 'MockAddonsItem',
      'panels/root/stk_item': 'MockStkItem',
      'modules/bluetooth/version_detector': 'MockBluetoothVersionDetector'
    }
  };

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    loadBodyHTML('_root.html');

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit,
          show: options.onShow,
          beforeShow: options.onBeforeShow,
          beforeHide: options.onBeforeHide,
          hide: options.onHide,
          uninit: options.onUninit,
          _showSimItems: function() {},
          _showDeveloperMenuItem: function() {}
        };
      };
    });

    // Define MockRoot
    this.mockRoot = {
      init: function() {}
    };
    define('MockRoot', function() {
      return function() {
        return that.mockRoot;
      };
    });

    MockAirplaneModeItem = {
      enabled: false
    };
    define('MockAirplaneModeItem', function() {
      return function(element) {
        return MockAirplaneModeItem;
      };
    });

    define('MockThemesItem', function() {
      return function(element) {
        return {};
      };
    });

    define('MockAddonsItem', function() {
      return function(element) {
        return {};
      };
    });

    define('MockStkItem', function() {
      return function(element) {
        return {};
      };
    });

    define('MockBluetoothVersionDetector', function() {
      return {
        getVersion: function() {}
      };
    });

    requireCtx(modules, function(RootPanel) {
      navigator.addIdleObserver = sinon.spy();
      realMobileConnections = navigator.mozMobileConnections;
      realSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      panel = RootPanel();
      done();
    });
  });

  teardown(function() {
    navigator.mozSettings = realSettings;
    navigator.mozMobileConnections = realMobileConnections;
    document.body.innerHTML = '';
  });

  test('AirplaneModeItem is enabled on show', function() {
    panel.init(document);
    panel.show();
    assert.isTrue(MockAirplaneModeItem.enabled);
  });

  test('AirplaneModeItem is disabled on uninit', function() {
    panel.init(document);
    panel.uninit();
    assert.isFalse(MockAirplaneModeItem.enabled);
  });
});
