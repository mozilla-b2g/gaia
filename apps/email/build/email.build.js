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

  // Set to 'uglify2' to get uglify to run using the
  // uglify2 settings below.
  optimize: 'none',

  // Just strip comments, no code compression or mangling.
  // Only active if optimize: 'uglify2'
  uglify2: {
    // Comment out the output section to get rid of line
    // returns and tabs spacing.
    output: {
      beautify: true
    },
    compress: false,
    mangle: false
  },

  fileExclusionRegExp: /^\.|^test$|^build$/,

  // Keeping build dir since Makefile cleans it up and
  // preps build dir with the shared directory
  keepBuildDir: true,
  removeCombined: true
}
