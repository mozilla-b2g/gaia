'use strict';

var utils = require('utils');
var nodeHelper = new utils.NodeHelper();

exports.execute = function(options, webapp) {
  options.webapp = webapp;

  nodeHelper.require('media-resolution', options);

  nodeHelper.require('post-manifest', options);

  require('./multilocale').execute(options);

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

  if (options.DEBUG === '0') {
    // Workaround for bug 955999, after multilocale, settings and system
    // generate too long args exceed nsIProcess.runw() can handle.
    // Thus, we clean webapp.asts values which generates from l10n in order to
    // pass into nsIProcess.runw()
    // It can remove by bug 1131516 once all post-app tasks are refactored.
    options.webapp.asts = '';
    nodeHelper.require('webapp-zip', options);
  }
};
