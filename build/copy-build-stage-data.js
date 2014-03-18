const utils = require('./utils');

/**
 * Updates hostnames for InterApp Communication APIs
 */
function manifestInterAppHostnames(manifest, config) {
  function convertToLocalUrl(url) {
    var host = config.GAIA_DOMAIN + config.GAIA_PORT;

    return url
      .replace(/^(http|app):\/\//, config.GAIA_SCHEME)
      .replace(/gaiamobile.org(:[0-9])?/, host);
  }
  if (manifest.connections) {
    for (let i in manifest.connections) {
      var connection = manifest.connections[i];
      if (!connection.rules || !connection.rules.manifestURLs) {
        continue;
      }

      var manifestURLs = connection.rules.manifestURLs;
      manifestURLs.forEach(function(url, idx) {
        manifestURLs[idx] = convertToLocalUrl(url);
      });
    }
  }
  return manifest;
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

function execute(options) {
  const WEBAPP_FILENAME = 'manifest.webapp';
  var webappsJSON = {};
  var gaia = utils.gaia.getInstance(options);
  var webappsBaseDir = utils.getFile(options.PROFILE_DIR);

  var stageDir = utils.getFile(options.STAGE_DIR);
  var webappsJSONFile = stageDir.clone();
  webappsJSONFile.append('webapps_stage.json');
  var webappsStageJSON = utils.getJSON(webappsJSONFile);

  webappsBaseDir.append('webapps');

  if (webappsBaseDir.exists()) {
    // remove all external app with uuid folder name
    utils.cleanProfile(webappsBaseDir);
  } else {
    utils.ensureFolderExists(webappsBaseDir);
  }

  gaia.webapps.forEach(function(app) {
    var manifest = app.buildManifestFile;
    // Compute webapp folder name in profile
    let webappTargetDir = webappsBaseDir.clone();

    // Preparing webapps.json content
    var appConfig = webappsStageJSON[app.sourceDirectoryName];
    var webappTargetDirName = appConfig.webappTargetDirName;
    webappsJSON[webappTargetDirName] = genWebappJSON(appConfig);

    if (!manifest.exists()) {
      return;
    }

    if (utils.isExternalApp(app)) {
      var appSource = stageDir.clone();

      appSource.append(app.sourceDirectoryName);
      webappTargetDir.append(webappTargetDirName);

      utils.ensureFolderExists(webappTargetDir);
      utils.moveExternalApp(app, appSource, webappTargetDir);
      return;
    }

    var manifestContent;
    if (gaia.l10nManager) {
      manifestContent = gaia.l10nManager.localizeManifest(app);
    } else {
      manifestContent = utils.getJSON(manifest);
    }
    var targetManifest = webappsBaseDir.clone();
    targetManifest.append(app.domain);
    utils.ensureFolderExists(targetManifest);
    targetManifest.append(WEBAPP_FILENAME);
    manifestContent = manifestInterAppHostnames(manifestContent, options);
    utils.writeContent(targetManifest, JSON.stringify(manifestContent));
  });

  var manifestFile = webappsBaseDir.clone();
  manifestFile.append('webapps.json');
  utils.writeContent(manifestFile,
    JSON.stringify(webappsJSON, null, 2) + '\n');
}

exports.execute = execute;
