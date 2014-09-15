{
  appDir: '..',
  baseUrl: 'js',
  dir: '../../../build_stage/email',
  mainConfigFile: '../js/mail_app.js',
  paths: {
    prim: 'empty:'
  },
/*
  wrap: {
    start: 'plog("@@@ START OF BUILD LAYER");',
    end: 'plog("@@@ END OF BUILD LAYER");'
  },
*/

  // Be sure to normalize all define() calls by extracting
  // dependencies so Function toString is not needed, and
  // lower capability devices like Tarako can optimize
  // memory by discarding function sources. This is
  // automatically done when an 'optimize' value other than
  // 'none' is used. This setting makes sure it happens for
  // builds where 'none' is used for 'optimize'.
  normalizeDirDefines: 'all',

  // Rewrite the waitSeconds config so that we never time out
  // waiting for modules to load in production. See js/mail_app.js
  // for more details.
  onBuildWrite: function(id, url, contents) {
    if (id === 'mail_app') {
      return contents.replace(/waitSeconds:\s*\d+/, 'waitSeconds: 0');
    } else {
      return contents;
    }
  },

  modules: [
    {
      name: 'mail_app',
      include: [
        'alameda',
        'l10nbase',
        'l10ndate',
        'tmpl',
        'text',
        'value_selector',
        'folder_depth_classes',
        'iframe_shims',
        'mix',
        'cards/editor_mixins',

        // Bundle most likely, frequently used cards
        'cards/message_list',
        'cards/folder_picker'
      ]
    },
    {
      name: 'cards/compose',
      exclude: ['mail_app']
    },
    {
      name: 'cards/message_reader',
      exclude: ['mail_app']
    }
  ],

  // This is now passed via Makefile's GAIA_EMAIL_MINIFY
  // but default is uglify2 if not passed at all.
  // optimize: 'none',

  // Just strip comments, no code compression or mangling.
  // Only active if optimize: 'uglify2'
  uglify2: {
    // Comment out the output section to get rid of line
    // returns and tabs spacing.
    output: {
      beautify: true
    }
  },

  fileExclusionRegExp: /^\.|^test$|^build$|^ext$|^services.js$/,

  // Keeping build dir since Makefile cleans it up and
  // preps build dir with the shared directory
  keepBuildDir: true,
  removeCombined: true
}
