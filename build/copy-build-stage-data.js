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
    var manifestFile = utils.getFile(webapp.manifestFilePath);
    manifestFile.copyTo(destination, 'manifest.webapp');

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
  var webapp = options.webapp;
  const WEBAPP_FILENAME = 'manifest.webapp';
  const UPDATE_WEBAPP_FILENAME = 'update.webapp';

  var webappManifest = utils.getFile(webapp.buildDirectoryFilePath);
  var updateManifest = utils.getFile(webapp.buildDirectoryFilePath);

  webappManifest.append(WEBAPP_FILENAME);
  updateManifest.append(UPDATE_WEBAPP_FILENAME);

  var stageManifest =
    webappManifest.exists() ? webappManifest : updateManifest;

  if (!stageManifest.exists()) {
    return;
  }

  var profileDirectoryFile = utils.getFile(webapp.profileDirectoryFilePath);
  utils.ensureFolderExists(profileDirectoryFile);

  if (utils.isExternalApp(webapp)) {
    var appSource = utils.getFile(webapp.buildDirectoryFilePath);
    moveExternalApp(webapp, appSource, profileDirectoryFile);
    return;
  }

  // We'll remove it once bug 968666 is merged.
  var targetManifest = utils.getFile(webapp.profileDirectoryFilePath);
  stageManifest.copyTo(targetManifest, WEBAPP_FILENAME);
}

exports.execute = execute;
