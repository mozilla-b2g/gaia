// This script is to copy necessary data from build_stage to profile folder,
// include
// 1. copy external app, which may rename the name of stage folder to uuid name.
// 2. generate webapps.json in profile by webapps_stage.json.
// 3. generate settings.json in profile by settings_stage.json.
const utils = require('./utils');

function moveExternalApp(webapp, source, destination) {
  // In case of packaged app, just copy `application.zip` and `update.webapp`
  if (webapp.pckManifest) {
    var updateManifest = source.clone();
    updateManifest.append('update.webapp');
    if (!updateManifest.exists()) {
      throw 'External packaged webapp `' + webapp.domain + '  is ' +
            'missing an `update.webapp` file. This JSON file ' +
            'contains a `package_path` attribute specifying where ' +
            'to download the application zip package from the origin ' +
            'specified in `metadata.json` file.';
      return;
    }
    var appPackage = source.clone();
    appPackage.append('application.zip');
    appPackage.copyTo(destination, 'application.zip');
    updateManifest.copyTo(destination, 'update.webapp');
  } else {
    webapp.manifestFile.copyTo(destination, 'manifest.webapp');

    // This is an hosted app. Check if there is an offline cache.
    var srcCacheFolder = source.clone();
    srcCacheFolder.append('cache');
    if (srcCacheFolder.exists()) {
      var cacheManifest = srcCacheFolder.clone();
      cacheManifest.append('manifest.appcache');
      if (!cacheManifest.exists()) {
        throw 'External webapp `' + webapp.domain +
              '` has a cache directory without `manifest.appcache`' +
              ' file.';
        return;
      }

      // Copy recursively the whole cache folder to webapp folder
      var targetCacheFolder = destination.clone();
      targetCacheFolder.append('cache');
      utils.copyRec(srcCacheFolder, targetCacheFolder);
    }
  }
}

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
                     'etag', 'packageEtag', 'appStatus'];
  var resultJSON = {};

  configItems.forEach(function(key) {
    if (key in config) {
      resultJSON[key] = config[key];
    }
  });
  return resultJSON;
}

/**
 * Copy settings_stage.json under stage to settings.json under profile.
 */
function copySettingsJStoProfile(stageDir, profileDir) {
  var settingsFile = stageDir.clone();
  var defaultsDir = profileDir.clone();
  settingsFile.append('settings_stage.json');
  settingsFile.copyTo(profileDir, 'settings.json');

  defaultsDir.append('defaults');
  utils.ensureFolderExists(defaultsDir);
  settingsFile.copyTo(defaultsDir, 'settings.json');
}

function execute(options) {

  const WEBAPP_FILENAME = 'manifest.webapp';
  const UPDATE_WEBAPP_FILENAME = 'update.webapp';
  var webappsJSON = {};
  var gaia = utils.gaia.getInstance(options);
  var webappsBaseDir = utils.getFile(options.PROFILE_DIR);
  var stageDir = gaia.stageDir;

  if (options.BUILD_APP_NAME === '*') {
    copySettingsJStoProfile(stageDir, webappsBaseDir);
  }

  var webappsJSONFile = stageDir.clone();
  webappsJSONFile.append('webapps_stage.json');
  var webappsStageJSON = utils.getJSON(webappsJSONFile);

  webappsBaseDir.append('webapps');

  if (webappsBaseDir.exists()) {
    // remove all external app with uuid folder name
    cleanProfile(webappsBaseDir);
  } else {
    utils.ensureFolderExists(webappsBaseDir);
  }

  gaia.webapps.forEach(function(app) {
    var webappManifest = app.buildDirectoryFile.clone();
    var updateManifest = app.buildDirectoryFile.clone();

    webappManifest.append(WEBAPP_FILENAME);
    updateManifest.append(UPDATE_WEBAPP_FILENAME);

    var stageManifest =
      webappManifest.exists() ? webappManifest : updateManifest;

    if (!stageManifest.exists()) {
      return;
    }

    // Compute webapp folder name in profile
    let webappTargetDir = webappsBaseDir.clone();

    // Preparing webapps.json content
    var appConfig = webappsStageJSON[app.sourceDirectoryName];
    var webappTargetDirName = appConfig.webappTargetDirName;
    webappsJSON[webappTargetDirName] = genWebappJSON(appConfig);

    webappTargetDir.append(webappTargetDirName);
    utils.ensureFolderExists(webappTargetDir);
    if (utils.isExternalApp(app)) {
      var appSource = stageDir.clone();
      appSource.append(app.sourceDirectoryName);
      moveExternalApp(app, appSource, webappTargetDir);
      return;
    }

    // We'll remove it once bug 968666 is merged.
    var targetManifest = webappTargetDir.clone();
    stageManifest.copyTo(targetManifest, WEBAPP_FILENAME);
  });

  var manifestFile = webappsBaseDir.clone();
  manifestFile.append('webapps.json');
  utils.writeContent(manifestFile,
    JSON.stringify(webappsJSON, null, 2) + '\n');
}

exports.execute = execute;
