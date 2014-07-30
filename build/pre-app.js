/* global exports */
/* global require */
'use strict';

function execute(options) {
  require('./clean-stage-app').execute(options);
  require('./svoperapps').execute(options);

  // Generate $(PROFILE_FOLDER)/webapps/
  // We duplicate manifest.webapp to manifest.webapp and manifest.json
  // to accommodate Gecko builds without bug 757613. Should be removed someday.
  //
  // We depend on app-makefiles so that per-app Makefiles could modify the
  // manifest as part of their build step.  None currently do this, and
  // webapp-manifests.js would likely want to change to see if the build
  // directory includes a manifest in that case.  Right now this is just making
  // sure we don't race app-makefiles in case someone does decide to get fancy.
  require('./webapp-manifests').execute(options);

  require('./contacts-import-services').execute(options);

  // A separate step for shared/ folder to generate its content in build time
  require('./keyboard-layouts').execute(options);

  if (options.BUILD_APP_NAME == '*') {
    require('./settings').execute(options);
  }

  // Copy shared files to stage folders
  require('./webapp-shared').execute(options);
}
exports.execute = execute;
