const INSTALL_TIME = 132333986000; // Match this to value in applications-data.js

function debug(msg) {
  //dump('-*- webapp-manifest.js: ' + msg + '\n');
}

let io = Cc['@mozilla.org/network/io-service;1']
           .getService(Components.interfaces.nsIIOService);

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

function checkOrigin(origin) {
  try {
    return (io.newURI(origin, null, null).prePath === origin);
  } catch (e) {
    return false;
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
  // appStatus == 2 means this is a privileged app.
  // appStatus == 1 means this is an installed (unprivileged) app

  var localId = id++;
  // localId start from 1 in release build. For BROWSER=1 build the system
  // app can run inside Firefox desktop inside a regular tab and so the
  // permissions set based on a principal are not working.
  // To make it works the system app will be assigned an id of 0, which
  // is the equivalent of the const NO_APP_ID.
  if (BROWSER && webappTargetDirName == ('system.' + GAIA_DOMAIN)) {
    localId = 0;
  }

  let url = webapp.url;
  manifests[webappTargetDirName] = {
    origin:        url,
    installOrigin: url,
    receipt:       null,
    installTime:   INSTALL_TIME,
    manifestURL:   url + '/manifest.webapp',
    appStatus:     getAppStatus(webapp.manifest.type),
    localId:       localId
  };

});

let errors = [];

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

  let removable;
  let manifestURL = webapp.metaData.manifestURL;

  if (!manifestURL) {
    errors.push('External webapp `' + webapp.domain + '` does not have the ' +
                'mandatory manifestURL property.');
    return;
  }

  let manifestURI;
  try {
    manifestURI = io.newURI(manifestURL, null, null);
  } catch (e) {
    let msg = 'Error ' + e.name + ' while parsing manifestURL for webapp ' +
               webapp.domain + ': ' + manifestURL;
    if (e.name === 'NS_ERROR_MALFORMED_URI') {
      msg += '\n    Is it an absolute URL?';
    }

    errors.push(msg);
    return;
  }

  if (manifestURI.scheme === 'app') {
    dump('Warning: external webapp `' + webapp.domain + '` has a manifestURL ' +
          'with an app:// scheme, which makes it non-updatable.\n');
  }

  let origin = webapp.metaData.origin;
  if (origin) {
    if (!checkOrigin(origin)) {
      errors.push('External webapp `' + webapp.domain + '` has an invalid ' +
                  'origin: ' + origin);
      return;
    }
  } else {
    origin = manifestURI.prePath;
  }

  let installOrigin = webapp.metaData.installOrigin || origin;
  if (!checkOrigin(installOrigin)) {
    errors.push('External webapp `' + webapp.domain + '` has an invalid ' +
                'installOrigin: ' + installOrigin);
    return;
  }

  // In case of packaged app, just copy `application.zip` and `update.webapp`
  let appPackage = webapp.sourceDirectoryFile.clone();
  appPackage.append('application.zip');
  if (appPackage.exists()) {
    let updateManifest = webapp.sourceDirectoryFile.clone();
    updateManifest.append('update.webapp');
    if (!updateManifest.exists()) {
      errors.push('External packaged webapp `' + webapp.domain + '  is ' +
                  'missing an `update.webapp` file. This JSON file ' +
                  'contains a `package_path` attribute specifying where ' +
                  'to download the application zip package from the origin ' +
                  'specified in `metadata.json` file.');
      return;
    }
    appPackage.copyTo(webappTargetDir, 'application.zip');
    updateManifest.copyTo(webappTargetDir, 'update.webapp');
    removable = ("removable" in webapp.metaData) ? !!webapp.metaData.removable
                                                 : true;
  } else {
    webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');
    removable = ("removable" in webapp.metaData) ? !!webapp.metaData.removable
                                                 : true;

    // This is an hosted app. Check if there is an offline cache.
    let srcCacheFolder = webapp.sourceDirectoryFile.clone();
    srcCacheFolder.append('cache');
    if (srcCacheFolder.exists()) {
      let cacheManifest = srcCacheFolder.clone();
      cacheManifest.append('manifest.appcache');
      if (!cacheManifest.exists()) {
        errors.push('External webapp `' + webapp.domain + '` has a cache ' +
                    'directory without `manifest.appcache` file.');
        return;
      }

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

if (errors.length) {
  var introMessage = 'We got ' + errors.length + ' manifest error' +
    ((errors.length > 1) ? 's' : '') + ' while building:';
  errors.unshift(introMessage);
  var message = errors.join('\n * ') + '\n';
  throw new Error(message);
}

// Write webapps global manifest
let manifestFile = webappsTargetDir.clone();
manifestFile.append('webapps.json');

// stringify json with 2 spaces indentation
writeContent(manifestFile, JSON.stringify(manifests, null, 2) + '\n');

