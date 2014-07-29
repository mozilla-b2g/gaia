{
  appDir: '..',
  baseUrl: 'js',
  mainConfigFile: '../js/config/require.js',
  dir: '../../../build_stage/gallery',
  insertRequire: ['main'],
  name: 'main',
  include: [
    '../bower_components/requirejs/index',
    'config/require'
  ],

  // Be sure to normalize all define() calls by extracting
  // dependencies so Function toString is not needed, and
  // lower capability devices like Tarako can optimize
  // memory by discarding function sources. This is
  // automatically done when an 'optimize' value other than
  // 'none' is used. This setting makes sure it happens for
  // builds where 'none' is used for 'optimize'.
  normalizeDirDefines: 'all',

  // This is defined in the makefile
  //optimize: 'uglify',
  optimizeCss: 'standard',

  // Keeping build dir since Makefile cleans it up and
  // preps build dir with the shared directory
  keepBuildDir: true,
  removeCombined: true
}
