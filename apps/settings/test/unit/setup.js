/* global requirejs */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
requireApp('settings/js/vendor/alameda.js', (function() {
  var requireFunc = requirejs.config({
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
      'shared_mocks/mock_navigator_moz_settings': {
        exports: 'MockNavigatorSettings'
      },
      'shared_mocks/mock_keyboard_helper': {
        exports: 'MockKeyboardHelper'
      }
    },
    modules: [
      {
        name: 'main'
      }
    ]
  });

  this.testRequire = function(module, map, callback) {
    if (arguments.length === 2) {
      callback = map;
      map = null;
    }

    if (map) {
      requireFunc = requireFunc.config({
        map: map
      });
    }

    requireFunc(module, callback);
  };
}).bind(window));
