'use strict';

require.config({
  baseUrl: '../',
  waitSeconds: 60,
  paths: {
    // URIs are resolved based on parent worker!!
    shared: '../shared/js',
    common: '../common',
    ext: '../ext'
  },
  shim: {
    'ext/caldav': {
      deps: ['caldav/worker/initialize'],
      exports: 'Caldav'
    },
    'ext/ical': {
      deps: ['caldav/worker/initialize'],
      exports: 'ICAL'
    }
  }
});

self.addEventListener('message', function onMessage(msg) {
  if (typeof(caldav) !== 'undefined') {
    return self.thread.respond(msg.data);
  }

  // Try again in a little bit since the worker may not be ready...
  setTimeout(function() {
    onMessage(msg);
  }, 10);
});

require(['caldav/worker/initialize'], initialize => initialize());
