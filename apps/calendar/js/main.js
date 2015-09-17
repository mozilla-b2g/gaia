(function() {
'use strict';

window.onerror = function errHandler(msg, url, line) {
  console.error('window.onerror Error:', msg, '@', url, ':', line);
  return false;
};

window.require = window.require || window.curl;

require.config({
  baseUrl: '/js',
  waitSeconds: 60,
  paths: {
    shared: '/shared/js',
    dom: 'curl/plugin/dom',
    css: 'curl/plugin/css',
    models: 'common/models'
  },
  shim: {
    'ext/caldav': { exports: 'Caldav' },
    'ext/ical': { exports: 'ICAL' },
    'ext/page': { exports: 'page' },
    'shared/gesture_detector': { exports: 'GestureDetector' },
    'shared/input_parser': { exports: 'InputParser' },
    'shared/lazy_loader': { exports: 'LazyLoader' },
    'shared/notification_helper': { exports: 'NotificationHelper' }
  }
});

// first require.config call is used by r.js optimizer, so we do this second
// call to list modules that are bundled to avoid duplicate defines
require.config({
  paths: {
    'views/week': 'lazy_loaded',
    'views/advanced_settings': 'lazy_loaded',
    'views/create_account': 'lazy_loaded',
    'views/day': 'lazy_loaded',
    'views/modify_account': 'lazy_loaded',
    'views/modify_event': 'lazy_loaded',
    'views/settings': 'lazy_loaded',
    'views/view_event': 'lazy_loaded'
  }
});

require(['app'], app => app.init());

}());
