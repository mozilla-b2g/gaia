'use strict';

/**
 * Updates webapps.json's manifest.webapp hash and package.json hash fields for
 * checking FOTA update
 */

var utils = require('./utils');

function execute(options) {
  var profileDir = options.PROFILE_DIR;
  var stageDir = options.STAGE_DIR;
  var webappsJSONFile = utils.getFile(options.PROFILE_DIR, 'apps',
    'webapps.json');

  if (!utils.fileExists(webappsJSONFile.path)) {
    return;
  }

  var webappsJSON = utils.getJSON(webappsJSONFile);

  for (let app in webappsJSON) {
    var manifestFile = utils.joinPath(profileDir, 'apps', app,
      'manifest.webapp');
    var updateFile = utils.joinPath(profileDir, 'apps', app,
      'update.webapp');
    var mainManifestFile;
    var appName = app.substring(0, app.indexOf('.'));
    var packageJSON = utils.joinPath(stageDir, appName, 'package.json');

    if (utils.fileExists(manifestFile)) {
      mainManifestFile = manifestFile;
    } else if (utils.fileExists(updateFile)) {
      mainManifestFile = updateFile;
    }

    if (mainManifestFile) {
      webappsJSON[app].manifestHash =
        utils.getHash(mainManifestFile, 'binary', 'md5');
    }

    if (utils.fileExists(packageJSON)) {
      webappsJSON[app].packageHash =
        utils.getHash(packageJSON, 'binary', 'md5');
    }
  }

  utils.writeContent(webappsJSONFile, JSON.stringify(webappsJSON, null, 2));
}

exports.execute = execute;
