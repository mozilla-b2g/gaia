/* global requirejs */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
requireApp('settings/js/vendor/alameda.js', (function() {
  var contextId = 0;
  var baseConfig = {
    baseUrl: '/js',
    urlArgs: 'bust=' + Date.now(),
    paths: {
      'modules': 'modules',
      'panels': 'panels',
      'shared': '../shared/js',
      'unit': '../test/unit',
      'shared_mocks': '../shared/test/unit/mocks'
    },
    shim: {
      'settings': {
        exports: 'Settings'
      },
      'shared/lazy_loader': {
        exports: 'LazyLoader'
      },
      'shared/screen_layout': {
        exports: 'ScreenLayout'
      },
      'shared/sanitizer': {
        exports: 'Sanitizer'
      },
      'shared/tz_select': {
        exports: 'tzSelect'
      },
      'unit/mock_async_storage': {
        exports: 'MockAsyncStorage'
      },
      'unit/mock_load_json': {
        exports: 'MockLoadJSON'
      },
      'unit/mock_settings': {
        exports: 'MockSettings'
      },
      'unit/mock_settings_cache': {
        exports: 'MockSettingsCache'
      },
      'unit/mock_settings_service': {
        exports: 'MockSettingsService'
      },
      'unit/mock_xml_http_request': {
        exports: 'MockXmlHttpRequest'
      },
      'unit/mock_moz_apps': {
        exports: 'MockMozApps'
      },
      'unit/mock_wifi_utils': {
        exports: 'MockWifiUtils'
      },
      'unit/mock_airplane_mode_helper': {
        exports: 'MockAirplaneModeHelper'
      },
      'unit/mock_apps_cache': {
        exports: 'MockAppsCache'
      },
      'shared_mocks/mock_navigator_moz_settings': {
        exports: 'MockNavigatorSettings'
      },
      'shared_mocks/mock_l10n': {
        exports: 'MockL10n'
      },
      'shared_mocks/mock_language_list': {
        exports: 'MockLanguageList'
      },
      'shared_mocks/mock_keyboard_helper': {
        exports: 'MockKeyboardHelper'
      },
      'shared_mocks/mock_settings_listener': {
        exports: 'MockSettingsListener',
        deps: ['shared_mocks/mock_navigator_moz_settings']
      },
      'shared_mocks/mock_permission_settings': {
        exports: 'MockPermissionSettings'
      },
      'shared_mocks/mock_manifest_helper': {
        exports: 'MockManifestHelper'
      },
      'shared_mocks/mock_moz_activity': {
        exports: 'MockMozActivity'
      },
      'shared_mocks/mock_settings_url': {
        exports: 'MockSettingsURL'
      },
      'shared_mocks/mock_wifi_helper': {
        exports: 'MockWifiHelper'
      },
      'shared_mocks/mock_navigator_moz_wifi_manager': {
        exports: 'MockNavigatorMozWifiManager'
      },
      'shared_mocks/mock_bluetooth_helper': {
        exports: 'MockBluetoothHelper'
      },
      'shared_mocks/mock_navigator_moz_bluetooth': {
        exports: 'MockMozBluetooth'
      },
      'shared_mocks/mock_enumerate_all': {
        exports: 'MockEnumerateAll'
      },
      'shared_mocks/mock_lazy_loader': {
        exports: 'MockLazyLoader'
      },
      'shared_mocks/mock_simslot_manager': {
        exports: 'MockSIMSlotManager'
      },
      'shared_mocks/mock_mobile_operator': {
        exports: 'MockMobileOperator'
      },
      'shared_mocks/mock_sim_settings_helper': {
        exports: 'MockSimSettingsHelper'
      },
      'shared_mocks/mock_navigator_moz_set_message_handler': {
        exports: 'MockNavigatormozSetMessageHandler'
      },
      'shared_mocks/mock_screen_layout': {
        exports: 'MockScreenLayout'
      },
      'shared_mocks/mock_stk_helper': {
        exports: 'MockSTKHelper'
      },
      'shared_mocks/mock_dump': {
        exports: 'MockDump'
      },
      'shared_mocks/mock_navigator_moz_icc_manager' : {
        exports: 'MockNavigatorMozIccManager'
      },
      'shared_mocks/mock_navigator_moz_power': {
        exports: 'MockMozPower'
      }
    },
    modules: [
      {
        name: 'main'
      }
    ]
  };

  this.testRequire = function(modules, map, callback) {
    var ctx;
    if (arguments.length === 2) {
      callback = map;
      map = null;
    }

    ctx = requirejs.config({
      context: contextId++
    });
    ctx.config(baseConfig);
    ctx.config({
      map: map || {}
    });

    ctx(modules, callback);
    return ctx;
  };
}).bind(window));
