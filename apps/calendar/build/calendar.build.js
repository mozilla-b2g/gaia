{
  appDir: '..',
  baseUrl: 'js',
  dir: '../../../build_stage/calendar',
  fileExclusionRegExp: /^\.|^build$|^test$|^backend$/,
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
