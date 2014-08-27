'use strict';

/* global exports, require, dump */

var utils = require('utils');

exports.execute = function(options) {
  var appRegExp;
  if (utils.getEnv('TRAVIS')) {
    dump('travis_fold:start:app\n');
  }
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
  if (utils.getEnv('TRAVIS')) {
    dump('travis_fold:end:app\n');
  }
};
