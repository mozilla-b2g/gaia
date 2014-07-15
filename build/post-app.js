/* global require, exports */
'use strict';

function execute(options) {
  require('./clean-build-files').execute(options);

  // Filter images/video by GAIA_DEV_PIXELS_PER_PX.
  require('./media-resolution').execute(options);

  // Updates hostnames for InterApp Communication APIs.
  require('./post-manifest').execute(options);

  if (options.LOCALE_BASEDIR) {
    require('./multilocale').execute(options);
  }

  // This task will do three things.
  // 1. Copy manifest to profile: generally we got manifest from
  //    webapp-manifest.js unless manifest is generated from Makefile of app.
  //    so we will copy manifest.webapp if it's avaiable in build_stage/ .
  // 2. Copy external app to profile dir.
  // 3. Generate webapps.json from webapps_stage.json and copy to profile dir.
  require('./copy-build-stage-data').execute(options);

  // Web app optimization steps (like precompling l10n, concatenating js files,
  // etc..).
  require('./webapp-optimize').execute(options);

  if (!options.DEBUG) {
    // Generate $(PROFILE_FOLDER)/webapps/APP/application.zip
    require('./webapp-zip').execute(options);
  }

  // Remove temporary l10n files created by the webapp-optimize step. Because
  // webapp-zip wants these files to still be around during the zip stage,
  // depend on webapp-zip so it runs to completion before we start the cleanup.
  require('./optimize-clean').execute(options);
}
exports.execute = execute;
