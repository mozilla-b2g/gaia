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
      'shared_mocks/mock_navigator_moz_settings': {
        exports: 'MockNavigatorSettings'
      },
      'shared_mocks/mock_keyboard_helper': {
        exports: 'MockKeyboardHelper'
      },
      'unit/mock_settings_service': {
        exports: 'MockSettingsService'
      },
      'unit/mock_xml_http_request': {
        exports: 'MockXmlHttpRequest'
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
