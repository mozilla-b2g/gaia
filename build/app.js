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

  require('./clean-stage-app').execute(options);
  require('./svoperapps').execute(options);

  // Generate webapps_stage.json from each app's manifest.webapp.
  require('./webapp-manifests').execute(options);

  // xports resources based on CONTACTS_IMPORT_SERVICES_PATH for Comms and FTU.
  require('./contacts-import-services').execute(options);

  // A separate step for shared/ folder to generate its content in build time.
  require('./keyboard-layouts').execute(options);

  // Generate settings.json.
  if (options.BUILD_APP_NAME == '*') {
    require('./settings').execute(options);
  }

  // Copy shared resources to stage folders.
  require('./webapp-shared').execute(options);

  // Generate user.js.
  require('./preferences').execute(options);

  // Wait for above tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  // Building each app. We execute app's own build.js if it has, or just simply
  // copy its content to build_stage.
  buildApps(options);

  // Wait for all app build script tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  // Remove unnecessary build file from stage, ex: Makefile, build, README...etc
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
  // Wait for above tasks to be done before quitting.
  utils.processEvents(function () {
    return { wait: false };
  });
};

exports.buildApps = buildApps;
