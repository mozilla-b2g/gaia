
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
  let url = webapp.url;
  manifests[webappTargetDirName] = {
    origin:        url,
    installOrigin: url,
    receipt:       null,
    installTime:   132333986000,
    manifestURL:   url + '/manifest.webapp',
    appStatus:     3,
    localId:       id++
  };

});

// Process external webapps from /gaia/external-app/ folder
Gaia.externalWebapps.forEach(function (webapp) {
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  // Compute webapp folder name in profile
  let webappTargetDirName = webapp.sourceDirectoryName;

  // Copy webapp's manifest to the profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);
  webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');

  let origin = webapp.sourceDirectoryFile.clone();
  origin.append('origin');

  let url = webapp.origin;
  if (!origin)
    throw new Error('External webapp `' + webapp.domain + '` doesn\'t have an' +
                    '`origin` file.');

  // Add webapp's entry to the webapps global manifest
  manifests[webappTargetDirName] = {
    origin:        url,
    installOrigin: url,
    receipt:       null,
    installTime:   132333986000,
    manifestURL:   url + 'manifest.webapp',
    localId:       id++
  };

  let srcCacheFolder = webapp.sourceDirectoryFile.clone();
  srcCacheFolder.append("cache");
  if (srcCacheFolder.exists()) {
    let cacheManifest = srcCacheFolder.clone();
    cacheManifest.append("manifest.appcache");
    if (!cacheManifest.exists())
      throw new Error('External webapp `' + webapp.domain + '` has a cache ' +
                      'directory without `manifest.appcache` file.');

    // Copy recursively the whole cache folder to webapp folder
    let targetCacheFolder = webappTargetDir.clone();
    targetCacheFolder.append("cache");
    copyRec(srcCacheFolder, targetCacheFolder);
  }
});

// Write webapps global manifest
let manifestFile = webappsTargetDir.clone();
manifestFile.append('webapps.json');
// stringify json with 2 spaces indentation
writeContent(manifestFile, JSON.stringify(manifests, null, 2) + '\n');
