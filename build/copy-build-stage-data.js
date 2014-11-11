'use strict';

/* global require, exports */

// This script is to copy external app from build_stage to profile folder,
// which may rename the name of stage folder to uuid name.

const utils = require('./utils');

function moveExternalApp(webapp, source, destination) {
  // In case of packaged app, just copy `application.zip` and `update.webapp`
  if (webapp.pckManifest) {
    let updateManifest = source.clone();
    updateManifest.append('update.webapp');
    if (!updateManifest.exists()) {
      throw 'External packaged webapp `' + webapp.domain + '  is ' +
            'missing an `update.webapp` file. This JSON file ' +
            'contains a `package_path` attribute specifying where ' +
            'to download the application zip package from the origin ' +
            'specified in `metadata.json` file.';
    }
    let appPackage = source.clone();
    appPackage.append('application.zip');
    appPackage.copyTo(destination, 'application.zip');
    updateManifest.copyTo(destination, 'update.webapp');
  } else {
    webapp.manifestFile.copyTo(destination, 'manifest.webapp');

    // This is an hosted app. Check if there is an offline cache.
    let srcCacheFolder = source.clone();
    srcCacheFolder.append('cache');
    if (srcCacheFolder.exists()) {
      let cacheManifest = srcCacheFolder.clone();
      cacheManifest.append('manifest.appcache');
      if (!cacheManifest.exists()) {
        throw 'External webapp `' + webapp.domain +
              '` has a cache directory without `manifest.appcache`' +
              ' file.';
      }

      // Copy recursively the whole cache folder to webapp folder
      let targetCacheFolder = destination.clone();
      targetCacheFolder.append('cache');
      utils.copyRec(srcCacheFolder, targetCacheFolder);
    }
  }
}

function execute(options) {
  const WEBAPP_FILENAME = 'manifest.webapp';
  const UPDATE_WEBAPP_FILENAME = 'update.webapp';
  var webappsBaseDir = utils.getFile(options.PROFILE_DIR);
  var stageDir = utils.getFile(options.STAGE_DIR);
  var targetWebapp = utils.getWebapp(options.APP_DIR,
    options.GAIA_DOMAIN, options.GAIA_SCHEME,
    options.GAIA_PORT, options.STAGE_DIR);

  var webappsJSONFile = stageDir.clone();
  webappsJSONFile.append('webapps_stage.json');
  var webappsStageJSON = utils.getJSON(webappsJSONFile);

  webappsBaseDir.append('webapps');

  var webappManifest = targetWebapp.buildDirectoryFile.clone();
  var updateManifest = targetWebapp.buildDirectoryFile.clone();

  webappManifest.append(WEBAPP_FILENAME);
  updateManifest.append(UPDATE_WEBAPP_FILENAME);

  var stageManifest =
    webappManifest.exists() ? webappManifest : updateManifest;

  if (!stageManifest.exists()) {
    return;
  }

  // Compute webapp folder name in profile
  var webappTargetDir = webappsBaseDir.clone();

  var appConfig = webappsStageJSON[targetWebapp.sourceDirectoryName];
  var webappTargetDirName = appConfig.webappTargetDirName;
  webappTargetDir.append(webappTargetDirName);
  utils.ensureFolderExists(webappTargetDir);

  if (utils.isExternalApp(targetWebapp)) {
    let appSource = stageDir.clone();
    appSource.append(targetWebapp.sourceDirectoryName);
    moveExternalApp(targetWebapp, appSource, webappTargetDir);
    return;
  }

  // We'll remove it once bug 968666 is merged.
  var targetManifest = webappTargetDir.clone();
  stageManifest.copyTo(targetManifest, WEBAPP_FILENAME);
}

exports.execute = execute;
