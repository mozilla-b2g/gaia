'use strict';

/* global exports, require, dump */

var utils = require('utils');

exports.execute = function(options) {
  var buildAppName = options.BUILD_APP_NAME;

  for (let appDir of options.GAIA_APPDIRS.split(' ')) {
    let appDirFile = utils.getFile(appDir);

    if (buildAppName === '*' || buildAppName === appDirFile.leafName) {
      let appOptions = utils.cloneJSON(options);
      let stageAppDir = utils.getFile(options.STAGE_DIR, appDirFile.leafName);

      appOptions.APP_DIR = appDirFile.path;
      appOptions.STAGE_APP_DIR = stageAppDir.path;

      let buildFile = utils.getFile(appDir, 'build', 'build.js');
      if (buildFile.exists()) {
        require(appDirFile.leafName + '/build').execute(appOptions);
      } else {
        utils.copyToStage(appOptions);
      }

      if (buildAppName === appDirFile.leafName) {
        break;
      }
    }
  }
  dump('done\n');
};
