{
  appDir: '..',
  baseUrl: 'js',
  dir: '../../../build_stage/calendar',
  fileExclusionRegExp: /^\.|^build$|^test$/,
  mainConfigFile: '../js/main.js',
  optimize: 'none',

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
      name: 'main',
      include: [
        'app',
        'debug',
        'next_tick'
      ]
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
      name: 'ext/alameda'
    },
    {
      name: 'ext/caldav'
    },
    {
      name: 'ext/ical'
    },
    {
      name: 'views/advanced_settings',
      exclude: ['main']
    },
    {
      name: 'views/calendar_colors',
      exclude: ['main']
    },
    {
      name: 'views/create_account',
      exclude: ['main']
    },
    {
      name: 'views/current_time',
      exclude: ['main']
    },
    {
      name: 'views/day',
      exclude: ['main']
    },
    {
      name: 'views/errors',
      exclude: ['main']
    },
    {
      name: 'views/first_time_use',
      exclude: ['main']
    },
    {
      name: 'views/modify_account',
      exclude: ['main']
    },
    {
      name: 'views/modify_event',
      exclude: ['main']
    },
    {
      name: 'views/month',
      exclude: ['main']
    },
    {
      name: 'views/months_day',
      exclude: ['main']
    },
    {
      name: 'views/settings',
      exclude: ['main']
    },
    {
      name: 'views/time_header',
      exclude: ['main']
    },
    {
      name: 'views/view_event',
      exclude: ['main']
    },
    {
      name: 'views/week',
      exclude: ['main']
    }
  ],

  paths: {
    prim: 'empty:',
    shared: '../shared/js'
  },

  // Rewrite the waitSeconds directive so that we never time out
  // waiting for modules to load in production. See
  // js/require_config.js for more details.
  onBuildWrite: function(id, url, contents) {
    if (id === 'main') {
      return contents.replace(/waitSeconds:\s*\d+/, 'waitSeconds: 0');
    } else {
      return contents;
    }
  },

  // Keeping build dir since Makefile cleans it up and
  // preps build dir with the shared directory
  keepBuildDir: true,
  removeCombined: true
}
