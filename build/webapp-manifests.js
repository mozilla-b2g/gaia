const INSTALL_TIME = 132333986000; // Match this to value in applications-data.js

function debug(msg) {
  //dump('-*- webapp-manifest.js: ' + msg + '\n');
}

let webappsTargetDir = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);
webappsTargetDir.initWithPath(PROFILE_DIR);
// Create profile folder if doesn't exists
if (!webappsTargetDir.exists())
  webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
// Create webapps folder if doesn't exists
webappsTargetDir.append('webapps');
if (!webappsTargetDir.exists())
  webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));

let manifests = {};
let id = 1;

function copyRec(source, target) {
  let results = [];
  let files = source.directoryEntries;
  if (!target.exists())
    target.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));

  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      let subFolder = target.clone();
      subFolder.append(file.leafName);
      copyRec(file, subFolder);
    } else {
      file.copyTo(target, file.leafName);
    }
  }
}

// Returns the nsIPrincipal compliant integer
// from the "type" property in manifests.
function getAppStatus(status) {
  let appStatus = 1; // By default, apps are installed
  switch (status) {
    case "certified":
      appStatus = 3;
      break;
    case "privileged":
      appStatus = 2;
      break;
    case "web":
    default:
      appStatus = 1;
      break;
  }
  return appStatus;
}

Gaia.webapps.forEach(function (webapp) {
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  // Compute webapp folder name in profile
  let webappTargetDirName = webapp.domain;

  // Copy webapp's manifest to the profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);
  webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');

  // Add webapp's entry to the webapps global manifest.
  // appStatus == 3 means this is a certified app.
  // appStatus == 2 means this is a privileged app.
  // appStatus == 1 means this is an installed (unprivileged) app

  let url = webapp.url;
  manifests[webappTargetDirName] = {
    origin:        url,
    installOrigin: url,
    receipt:       null,
    installTime:   INSTALL_TIME,
    manifestURL:   url + '/manifest.webapp',
    appStatus:     getAppStatus(webapp.manifest.type),
    localId:       id++
  };

});

// Process external webapps from /gaia/external-app/ folder
Gaia.externalWebapps.forEach(function (webapp) {
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  if (!webapp.metaData) {
    return;
  }

  // Compute webapp folder name in profile
  let webappTargetDirName = webapp.sourceDirectoryName;

  // Copy webapp's manifest to the profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);

  let origin;
  let installOrigin;
  let manifestURL;

  let removable;

  // In case of packaged app, just copy `application.zip` and `update.webapp`
  let appPackage = webapp.sourceDirectoryFile.clone();
  appPackage.append('application.zip');
  if (appPackage.exists()) {
    let updateManifest = webapp.sourceDirectoryFile.clone();
    updateManifest.append('update.webapp');
    if (!updateManifest.exists()) {
      throw new Error('External packaged webapp `' + webapp.domain + '  is ' +
                      'missing an `update.webapp` file. This JSON file ' +
                      'contains a `package_path` attribute specifying where ' +
                      'to download the application zip package from the origin ' +
                      'specified in `metadata.json` file.');
    }
    appPackage.copyTo(webappTargetDir, 'application.zip');
    updateManifest.copyTo(webappTargetDir, 'update.webapp');
    removable = true;
    origin = webapp.metaData.origin;
    installOrigin = webapp.metaData.installOrigin;
    manifestURL = webapp.metaData.manifestURL;
  } else {
    webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');
    origin = webapp.metaData.origin;
    installOrigin = webapp.metaData.origin;
    manifestURL = webapp.metaData.origin + 'manifest.webapp';

    // This is an hosted app. Check if there is an offline cache.
    let srcCacheFolder = webapp.sourceDirectoryFile.clone();
    srcCacheFolder.append('cache');
    if (srcCacheFolder.exists()) {
      let cacheManifest = srcCacheFolder.clone();
      cacheManifest.append('manifest.appcache');
      if (!cacheManifest.exists())
        throw new Error('External webapp `' + webapp.domain + '` has a cache ' +
                        'directory without `manifest.appcache` file.');

      // Copy recursively the whole cache folder to webapp folder
      let targetCacheFolder = webappTargetDir.clone();
      targetCacheFolder.append('cache');
      copyRec(srcCacheFolder, targetCacheFolder);
    }
  }

  let etag = webapp.metaData.etag || null;
  let packageEtag = webapp.metaData.packageEtag || null;

  // Add webapp's entry to the webapps global manifest
  manifests[webappTargetDirName] = {
    origin:        origin,
    installOrigin: installOrigin,
    receipt:       null,
    installTime:   132333986000,
    manifestURL:   manifestURL,
    removable:     removable,
    localId:       id++,
    etag:          etag,
    packageEtag:   packageEtag,
    appStatus:     getAppStatus(webapp.metaData.type || "web"),
  };

});

// Write webapps global manifest
let manifestFile = webappsTargetDir.clone();
manifestFile.append('webapps.json');

// stringify json with 2 spaces indentation
writeContent(manifestFile, JSON.stringify(manifests, null, 2) + '\n');

