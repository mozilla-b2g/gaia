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
      'unit/mock_l10n': {
        exports: 'MockL10n'
      },
      'unit/mock_async_storage': {
        exports: 'MockAsyncStorage'
      },
      'unit/mock_load_json': {
        exports: 'MockLoadJSON'
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
      'shared_mocks/mock_navigator_moz_settings': {
        exports: 'MockNavigatorSettings'
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
