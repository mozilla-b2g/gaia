({
  baseUrl: '../js/backend',
  mainConfigFile: '../js/backend/calendar_worker.js',
  name: '../ext/almond',
  out: '../../../build_stage/calendar/js/backend/calendar_worker.js',
  include: [
    'calendar_worker'
  ],
  optimize: 'none',
  logLevel: 2,
  normalizeDirDefines: 'all'
})
