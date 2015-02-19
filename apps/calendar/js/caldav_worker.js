'use strict';

require.config({
  baseUrl: '/js',
  waitSeconds: 60,
  paths: {
    shared: '/shared/js'
  },
  shim: {
    'ext/caldav': {
      deps: ['worker/initialize'],
      exports: 'Caldav'
    },
    'ext/ical': {
      deps: ['worker/initialize'],
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

require(['worker/initialize'], initialize => initialize());
