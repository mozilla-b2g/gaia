{
  appDir: '..',
  baseUrl: 'js',
  dir: '../../../build_stage/calendar',
  fileExclusionRegExp: /^\.|^build$|^test$/,
  mainConfigFile: '../js/main.js',
  optimize: 'none',
  logLevel: 2,

  // Be sure to normalize all define() calls by extracting
  // dependencies so Function toString is not needed, and
  // lower capability devices like Tarako can optimize
  // memory by discarding function sources. This is
  // automatically done when an 'optimize' value other than
  // 'none' is used. This setting makes sure it happens for
  // builds where 'none' is used for 'optimize'.
  normalizeDirDefines: 'all',

  modules: [
    {
      create: true,
      name: 'bundle',
      include: [
        'ext/curl',
        'main',
        'views/errors',
        'views/month',
        'views/month_day_agenda',
        'views/time_header',
        'views/view_selector'
      ]
    },
    {
      create: true,
      name: 'lazy_loaded',
      include: [
        'views/current_time',
        'views/week',
        'views/advanced_settings',
        'views/create_account',
        'views/day',
        'views/modify_account',
        'views/modify_event',
        'views/settings',
        'views/view_event'
      ],
      exclude: ['bundle']
    },
    {
      name: 'caldav_worker',
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
        'service/caldav',
        'worker/initialize'
      ],
      exclude: [
        'ext/caldav',
        'ext/ical'
      ]
    },
    {
      name: 'ext/caldav'
    },
    {
      name: 'ext/ical'
    }
  ],

  paths: {
    prim: 'empty:',
    shared: '../shared/js'
  },

  // Keeping build dir since Makefile cleans it up and
  // preps build dir with the shared directory
  keepBuildDir: true,
  removeCombined: true
}
