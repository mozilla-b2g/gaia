({
  baseUrl: '../js/backend',
  name: 'caldav/caldav_worker',
  out: '../../../build_stage/calendar/js/backend/caldav/caldav_worker.js',
  include: [
    // This is needed so that we can use the rjs api right off the bat
    // in the worker rather than needing to load it via importScripts
    // before calling require, define, etc.
    'ext/alameda',
    // We need to load the caldav wrapper and external libs dynamically
    // since we have to prime the global environment for the caldav
    // and ical libraries before loading them (they use the global
    // variable window to figure out that they're in the browser vs. node
    // env which isn't a worker default). We should fix that upstream.
    'caldav/worker/caldav_service',
    'caldav/worker/initialize'
  ],
  exclude: [
    'ext/caldav',
    'ext/ical'
  ],
  paths: {
    // URIs are resolved based on parent worker!!
    shared: '../shared/js',
    common: '../common',
    ext: '../ext'
  },
  optimize: 'none',
  logLevel: 2,
  normalizeDirDefines: 'all'
})
