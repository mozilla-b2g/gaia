'use strict';

/* global exports, require */

var utils = require('utils');

function execute(options) {
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

  require('./clean-build-files').execute(options);

  // Filter images/video by GAIA_DEV_PIXELS_PER_PX.
  require('./media-resolution').execute(options);

  // Updates hostnames for InterApp Communication APIs.
  require('./post-manifest').execute(options);

  if (options.LOCALE_BASEDIR) {
    require('./multilocale').execute(options);
  }

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
