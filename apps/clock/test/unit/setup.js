'use strict';

requireApp('clock/test/unit/mocks/mock_moz_alarm.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_intl_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_moz_intl.js');

requireApp('clock/js/alameda.js', () => {
  this.require = requirejs.config({
    baseUrl: '/js',
    paths: {
      shared: '../shared',
      mocks: '../test/unit/mocks'
    },
    urlArgs: 'cache_bust=' + Date.now(),
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
    }
  });
});
