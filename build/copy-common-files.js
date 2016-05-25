'use strict';

/**
 * Copy common files such as webapps.json
 */

var utils = require('./utils');

function cleanProfile(webappsDir) {
  // Profile can contain folders with a generated uuid that need to be deleted
  // or apps will be duplicated.
  var expreg = /^{[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}}$/;
  utils.ls(webappsDir, false).forEach(function(dir) {
    if (expreg.test(dir.leafName)) {
      dir.remove(true);
    }
  });
}

/**
 * Generate data for webapps.json.
 */
function genWebappJSON(config) {
  var configItems = ['origin', 'installOrigin', 'receipt', 'installTime',
                     'updateTime', 'manifestURL', 'removable', 'localId',
                     'etag', 'packageEtag', 'appStatus', 'originalManifest'];
  var resultJSON = {};

  configItems.forEach(function(key) {
    if (key in config) {
      resultJSON[key] = config[key];
    }
  });
  return resultJSON;
}

function execute(options) {
  var webappsJSON = {};
  var gaia = utils.gaia.getInstance(options);
  var appsBaseDir = utils.getFile(options.COREWEBAPPS_DIR, 'apps');
  var stageDir = gaia.stageDir;

  var webappsJSONFile = utils.getFile(stageDir.path, 'webapps_stage.json');
  var webappsStageJSON = utils.getJSON(webappsJSONFile);

  if (appsBaseDir.exists()) {
    // remove all external app with uuid folder name
    cleanProfile(appsBaseDir);
  } else {
    utils.ensureFolderExists(appsBaseDir);
  }

  gaia.webapps.forEach(function(app) {
    // Preparing webapps.json content
    var appConfig = webappsStageJSON[app.sourceDirectoryName];
    var webappTargetDirName = appConfig.webappTargetDirName;
    webappsJSON[webappTargetDirName] = genWebappJSON(appConfig);
  });

  var manifestFile = utils.getFile(appsBaseDir.path, 'webapps.json');
  utils.writeContent(manifestFile, JSON.stringify(webappsJSON, null, 2) + '\n');
}

exports.execute = execute;
