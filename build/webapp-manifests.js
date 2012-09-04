
function debug(msg) {
  if (DEBUG)
    dump('-*- ' + msg + '\n');
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
const EXTERNAL_APPS_DIR = 'external-apps';
getSubDirectories(EXTERNAL_APPS_DIR).forEach(function readManifests(webappSrcDirName) {
  let webappSrcDir = getFile(GAIA_DIR, EXTERNAL_APPS_DIR, webappSrcDirName);
  let manifest = webappSrcDir.clone();
  manifest.append('manifest.webapp');

  // Ignore directories without manifest
  if (!manifest.exists())
    return;

  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webappSrcDirName != BUILD_APP_NAME)
    return;

  // Compute webapp folder name in profile
  let webappTargetDirName = webappSrcDirName;

  // Copy webapp's manifest to the profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);
  manifest.copyTo(webappTargetDir, 'manifest.webapp');

  let origin = webappSrcDir.clone();
  origin.append('origin');

  let url = getFileContent(origin);
  // Strip any leading/ending spaces
  url = url.replace(/^\s+|\s+$/, '');

  // Add webapp's entry to the webapps global manifest
  manifests[webappTargetDirName] = {
    origin:        url,
    installOrigin: url,
    receipt:       null,
    installTime:   132333986000,
    manifestURL:   url + '/manifest.webapp',
    localId:       id++
  };
});

// Write webapps global manifest
let manifestFile = webappsTargetDir.clone();
manifestFile.append('webapps.json');
// stringify json with 2 spaces indentation
writeContent(manifestFile, JSON.stringify(manifests, null, 2) + '\n');
