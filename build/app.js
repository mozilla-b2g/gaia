'use strict';

/* global exports, require */

var utils = require('utils');

function buildApps(options) {
  var appRegExp;
  try {
    appRegExp = utils.getAppNameRegex(options.BUILD_APP_NAME);
  } catch (e) {
    utils.log('utils', 'Using an invalid regular expression for APP ' +
      'environment variable, APP=' + options.BUILD_APP_NAME);
    throw e;
  }

  options.GAIA_APPDIRS.split(' ').forEach(function(appDir) {
    let appDirFile = utils.getFile(appDir);

    if (appRegExp.test(appDirFile.leafName)) {
      let appOptions = utils.cloneJSON(options);
      let stageAppDir = utils.getFile(options.STAGE_DIR, appDirFile.leafName);

      appOptions.APP_DIR = appDirFile.path;
      appOptions.STAGE_APP_DIR = stageAppDir.path;

      let buildFile = utils.getFile(appDir, 'build', 'build.js');
      if (buildFile.exists()) {
        utils.log('app', 'building ' + appDirFile.leafName + ' app...');
        require(appDirFile.leafName + '/build').execute(appOptions);
      } else {
        utils.copyToStage(appOptions);
      }
    }
  });
}

exports.execute = function(options) {
  var stageDir = utils.getFile(options.STAGE_DIR);
  utils.ensureFolderExists(stageDir);

  require('pre-app').execute(options);

  // Wait for all pre app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  buildApps(options);
  // Wait for all app build script tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  require('post-app').execute(options);
  // Wait for post app tasks to be done before quitting.
  utils.processEvents(function () {
    return { wait: false };
  });
};

exports.buildApps = buildApps;
