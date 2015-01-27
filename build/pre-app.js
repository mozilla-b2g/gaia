'use strict';

/* global require, exports */

function execute(options) {
  require('./clean-stage-app').execute(options);

  require('./svoperapps').execute(options);

  // Populates webapps_shared.json in stage folder
  // and uuid.json for external apps
  require('./webapp-manifests').execute(options);

  require('./contacts-import-services').execute(options);

  // A separate step for shared/ folder to generate its content in build time
  require('./keyboard-layouts').execute(options);

  // Generate user.js
  require('./preferences').execute(options);

  if (options.BUILD_APP_NAME == '*') {
    require('./settings').execute(options);
  }

  // Copy shared files to stage folders
  require('./webapp-shared').execute(options);

  // Copy common files such as webapps.json
  require('./copy-common-files').execute(options);
}
exports.execute = execute;
