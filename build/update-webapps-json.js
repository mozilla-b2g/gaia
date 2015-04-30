'use strict';

/* jshint node: true */

/**
 * Updates webapps.json's manifest.webapp hash and package.json hash fields for
 * checking FOTA update
 */

var utils = require('./utils');

function execute(options) {
  var profileDir = options.PROFILE_DIR;
  var stageDir = options.STAGE_DIR;
  var webappsJSONFile = utils.getFile(options.PROFILE_DIR, 'webapps',
    'webapps.json');

  if (!utils.fileExists(webappsJSONFile.path)) {
    return;
  }

  var webappsJSON = utils.getJSON(webappsJSONFile);

  for (let app in webappsJSON) {
    var manifestFile = utils.joinPath(profileDir, 'webapps', app,
      'manifest.webapp');
    var updateFile = utils.joinPath(profileDir, 'webapps', app,
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
      webappsJSON[app].manifestHash = utils.getMD5hash(mainManifestFile);
    }

    if (utils.fileExists(packageJSON)) {
      webappsJSON[app].packageHash = utils.getMD5hash(packageJSON);
    }
  }

  utils.writeContent(webappsJSONFile, JSON.stringify(webappsJSON, null, 2));
}

exports.execute = execute;
