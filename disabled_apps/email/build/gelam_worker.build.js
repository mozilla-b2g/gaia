{
  appDir: '../js/ext',
  baseUrl: '.',
  dir: '../../../build_stage/email/js/ext',
  mainConfigFile: '../js/ext/worker-config.js',

  // Do not optimize here, the general gaia email optimization
  // pass will do that, if it is desired.
  optimize: 'none',

  // Do not try to optimize CSS, that will be done in gaia
  // email build
  optimizeCss: 'none',

  // Be sure to normalize all define() calls by extracting
  // dependencies so Function toString is not needed, and
  // lower capability devices like Tarako can optimize
  // memory by discarding function sources. This is
  // automatically done when an 'optimize' value other than
  // 'none' is used. This setting makes sure it happens for
  // builds where 'none' is used for 'optimize'.
  normalizeDirDefines: 'all',

  // Remove the importScripts loading in worker-bootstrap source, since
  // the assets will be inlined.
  pragmas: {
    buildExclude: true
  },

  onBuildWrite: function (id, path, contents) {
    if (id === 'worker-bootstrap') {
      // The loading kickoff is stripped out from the source worker-bootstrap by
      // a pragma, because we want this to be at the end of the file, just for
      // cleanliness and code understanding, after all the defines are done.
      return contents + '\nrequire([\'worker-setup\']);';
    } else {
      return contents;
    }
  },

  modules: [
    {
      // There is enough cross reference of shared dependencies that we risk
      // loading duplicates for any other layers so just optimizing the initial
      // one used at worker startup. We are making a tradeoff between memory vs
      // initial load time. Since the email front end can start up without the
      // full load of the rest of the code in the worker favor saving memory.
      name: 'worker-bootstrap',
      include: [
        'alameda',
        'worker-config',
        'worker-setup',

        // Searches can happen offline.
        'searchfilter',

        // Job/operations are currently not gated, although they could be...
        'jobmixins',
        'jobs/outbox',
        'drafts/jobs',

        // Common account logic is required for everything.
        'accountmixins',

        // Include the chews because they are common and small-ish.
        'htmlchew',
        'quotechew',
        'mailchew',

        // main-frame-setup also wants this, so will delete it after the main
        // gaia app optimization runs, so include it now. Commonly needed at
        // some point during startup anyway.
        'addressparser',

        // Other common-ish utilities.
        'tcp-socket',
        'mix',
        'axe',
        'errorutils',
        'db/folder_info_rep',
        'mimetypes',
        'mimefuncs'
      ]
    },
    {
      name: 'composite/configurator',
      exclude: ['worker-bootstrap']
    },
    {
      name: 'activesync/configurator',
      // activesync/protocol needed for autodiscovery.
      exclude: ['worker-bootstrap', 'activesync/protocol']
    }
  ],

  // Just strip comments, no code compression or mangling.
  // Only active if optimize: 'uglify2'
  uglify2: {
    // Comment out the output section to get rid of line
    // returns and tabs spacing.
    output: {
      beautify: true
    }
  },

  // Keeping build dir since Makefile cleans it up and
  // preps build dir with the shared directory
  keepBuildDir: true,
  removeCombined: true
}
