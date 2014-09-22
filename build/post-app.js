/* global require, exports */
'use strict';

function execute(options) {
  // This task will do three things.
  // 1. Copy manifest to profile: generally we got manifest from
  //    webapp-manifest.js unless manifest is generated from Makefile of app.
  //    so we will copy manifest.webapp if it's avaiable in build_stage/ .
  // 2. Copy external app to profile dir.
  // 3. Generate webapps.json from webapps_stage.json and copy to profile dir.
  require('./copy-build-stage-data').execute(options);
}
exports.execute = execute;
