'use strict';

/* global require, exports */

exports.execute = function(options, webapp) {
  // Filter images/video by GAIA_DEV_PIXELS_PER_PX.
  require('./media-resolution').execute(options, webapp);

  // Updates manifest.webapp
  require('./post-manifest').execute(options, webapp);

  require('./multilocale').execute(options, webapp);

  // This task will do three things.
  // 1. Copy manifest to profile: generally we got manifest from
  //    webapp-manifest.js unless manifest is generated from Makefile of app.
  //    so we will copy manifest.webapp if it's avaiable in build_stage/ .
  // 2. Copy external app to profile dir.
  // 3. Generate webapps.json from webapps_stage.json and copy to profile dir.
  require('./copy-build-stage-data').execute(options, webapp);

  // Web app optimization steps (like precompling l10n, concatenating js files,
  // etc..).
  require('./webapp-optimize').execute(options, webapp);

  if (options.DEBUG === '0') {
    // Generate $(PROFILE_FOLDER)/webapps/APP/application.zip
    require('./webapp-zip').execute(options, webapp);
  }
};
