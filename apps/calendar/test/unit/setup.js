(function(window) {
'use strict';

var getTestLoader = require('/js/ext/alameda.js').then(() => {
  requirejs.config({
    baseUrl: '/js',
    paths: {
      css: '/test/unit/support/css',
      dom: '/test/unit/support/dom',
      shared: '/shared/js',
      sharedtest: '/shared/test/unit',
      test: '/test/unit'
    },
    map: {
      '*': {
        'ext/page': 'test/support/fake_page'
      }
    },
    shim: {
      'ext/caldav': { exports: 'Caldav' },
      'ext/ical': { exports: 'ICAL' },
      'shared/gesture_detector': { exports: 'GestureDetector' },
      'shared/notification_helper': { exports: 'NotificationHelper' },
      'sharedtest/mocks/mock_l10n': { exports: 'MockL10n' }
    }
  });

  return new Promise(res => requirejs(['test/support/test_loader'], res));
});

window.testAgentRuntime.testLoader = function(path) {
  return getTestLoader.then(testLoader => testLoader(path));
};

})(this);
