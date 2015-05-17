'use strict';

/**
 * This script is to copy external app from build_stage to profile folder,
 * which may rename the name of stage folder to uuid name.
 * This task will do three things.
 * 1. Copy manifest to profile: generally we got manifest from
 * webapp-manifest.js unless manifest is generated from Makefile of app.
 * so we will copy manifest.webapp if it's avaiable in build_stage/ .
 * 2. Copy external app to profile dir.
 * 3. Generate webapps.json from webapps_stage.json and copy to profile dir.
 */

var utils = require('./utils');

function moveExternalApp(webapp, source, destination) {
  // In case of packaged app, just copy `application.zip` and `update.webapp`
  if (webapp.pckManifest) {
    let updateManifest = utils.getFile(source.path, 'update.webapp');
    if (!updateManifest.exists()) {
      throw 'External packaged webapp `' + webapp.domain + '  is ' +
            'missing an `update.webapp` file. This JSON file ' +
            'contains a `package_path` attribute specifying where ' +
            'to download the application zip package from the origin ' +
            'specified in `metadata.json` file.';
    }
    let appPackage = utils.getFile(source.path, 'application.zip');
    utils.copyFileTo(appPackage, destination, 'application.zip');
    utils.copyFileTo(updateManifest, destination, 'update.webapp');
  } else {
    var manifestFile = utils.getFile(webapp.manifestFilePath);
    utils.copyFileTo(manifestFile, destination, 'manifest.webapp');

    // This is an hosted app. Check if there is an offline cache.
    let srcCacheFolder = utils.getFile(source.path, 'cache');
    if (srcCacheFolder.exists()) {
      let cacheManifest = utils.getFile(srcCacheFolder.path,
        'manifest.appcache');
      if (!cacheManifest.exists()) {
        throw 'External webapp `' + webapp.domain +
              '` has a cache directory without `manifest.appcache`' +
              ' file.';
      }

      // If it has a cache, it should also have a resources_metadata.json file
      let resourcesMetadata = utils.getFile(source.path,
        'resources_metadata.json');
      if (!resourcesMetadata.exists()) {
        throw 'External webapp `' + webapp.domain +
          '` has a cache directory without an associated `resources.metadata`' +
          ' file.';
      }

      utils.copyFileTo(resourcesMetadata, destination,
        'resources_metadata.json');

      // Copy recursively the whole cache folder to webapp folder
      let targetCacheFolder = utils.getFile(destination, 'cache');
      utils.copyRec(srcCacheFolder, targetCacheFolder);
    }
  }
}

function execute(options) {
  var webapp = options.webapp;

  var webappManifest = utils.getFile(webapp.buildDirectoryFilePath,
    'manifest.webapp');
  var updateManifest = utils.getFile(webapp.buildDirectoryFilePath,
    'update.webapp');

  var stageManifest = webappManifest.exists() ? webappManifest : updateManifest;

  if (!stageManifest.exists()) {
    return;
  }

  var profileDirectoryFile = utils.getFile(webapp.profileDirectoryFilePath);
  utils.ensureFolderExists(profileDirectoryFile);

  if (utils.isExternalApp(webapp)) {
    var appSource = utils.getFile(webapp.buildDirectoryFilePath);
    moveExternalApp(webapp, appSource, profileDirectoryFile.path);
    return;
  }

  // We'll remove it once bug 968666 is merged.
  var targetManifest = utils.getFile(webapp.profileDirectoryFilePath);
  utils.copyFileTo(stageManifest, targetManifest.path, 'manifest.webapp');
}

exports.execute = execute;
