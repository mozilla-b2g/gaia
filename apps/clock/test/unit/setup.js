'use strict';

requireApp('clock/test/unit/mocks/mock_moz_alarm.js');
require('/shared/test/unit/load_body_html_helper.js');

requireApp('clock/js/alameda.js', () => {
  this.require = requirejs.config({
    baseUrl: '/js',
    paths: {
      shared: '../shared',
      mocks: '../test/unit/mocks'
    },
    urlArgs: 'cache_bust=' + Date.now(),
    map: {
      '*': {
        'l10n': 'mocks/mock_moz_l10n'
      }
    },
    shim: {
      'shared/js/template': {
        exports: 'Template'
      },
      'shared/js/gesture_detector': {
        exports: 'GestureDetector'
      },
      'shared/js/accessibility_helper': {
        exports: 'AccessibilityHelper'
      },
      'shared/js/async_storage': {
        exports: 'asyncStorage'
      },
      'shared/js/l10n_date': ['shared/js/l10n']
    }
  });
});
