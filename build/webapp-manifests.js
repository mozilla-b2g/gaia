var utils = require('./utils');
var config;
const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');

const INSTALL_TIME = 132333986000;
const DEBUG = false;
// Match this to value in applications-data.js

function debug(msg) {
//  dump('-*- webapp-manifest.js: ' + msg + '\n');
}

let io = Cc['@mozilla.org/network/io-service;1']
           .getService(Ci.nsIIOService);

let webappsTargetDir = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);

let uuidGenerator = Cc['@mozilla.org/uuid-generator;1']
                      .createInstance(Ci.nsIUUIDGenerator);

let manifests = {};
let webapps = {};

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
    case 'certified':
      appStatus = 3;
      break;
    case 'privileged':
      appStatus = 2;
      break;
    case 'web':
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

/**
 * Updates hostnames for InterApp Communication APIs
 */
function manifestInterAppHostnames(webapp, webappTargetDir) {
  function convertToLocalUrl(url) {
    var host = config.GAIA_DOMAIN + config.GAIA_PORT;

    return url
      .replace(/^(http|app):\/\//, config.GAIA_SCHEME)
      .replace(/gaiamobile.org(:[0-9])?/, host);
  }

  let manifest = utils.getJSON(
    utils.getFile(webappTargetDir.path, 'manifest.webapp'));

  if (manifest.connections) {
    for (let i in manifest.connections) {
      let connection = manifest.connections[i];
      if (!connection.rules || !connection.rules.manifestURLs) {
        continue;
      }

      var manifestURLs = connection.rules.manifestURLs;
      manifestURLs.forEach(function(url, idx) {
        manifestURLs[idx] = convertToLocalUrl(url);
      });
    }
    utils.writeContent(utils.getFile(webappTargetDir.path, 'manifest.webapp'),
                       JSON.stringify(manifest));
  }
}

function fillAppManifest(webapp) {
  // Compute webapp folder name in profile
  let webappTargetDirName = webapp.domain;

  // Copy webapp's manifest to the profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);
  let gaia = utils.getGaia(config);

  if (gaia.l10nManager) {
    let manifest = gaia.l10nManager.localizeManifest(webapp);
    manifestFile = webappTargetDir.clone();
    utils.ensureFolderExists(webappTargetDir);
    manifestFile.append('manifest.webapp');
    let args = DEBUG ? [manifest, undefined, 2] : [manifest];
    utils.writeContent(manifestFile, JSON.stringify.apply(JSON, args));
  } else {
    webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');
  }

  manifestInterAppHostnames(webapp, webappTargetDir);

  // Add webapp's entry to the webapps global manifest.
  // appStatus == 3 means this is a certified app.
  // appStatus == 2 means this is a privileged app.
  // appStatus == 1 means this is an installed (unprivileged) app

  var localId = id++;
  let url = webapp.url;
  manifests[webappTargetDirName] = {
    origin: url,
    installOrigin: url,
    receipt: null,
    installTime: INSTALL_TIME,
    manifestURL: url + '/manifest.webapp',
    appStatus: getAppStatus(webapp.manifest.type),
    localId: localId
  };

  webapps[webapp.sourceDirectoryName] = webapp;
  webapps[webapp.sourceDirectoryName].webappsJson = manifests[webappTargetDirName];
}

let errors = [];

function fillExternalAppManifest(webapp) {
  // Report an error if the app is packaged and has a origin on the metadata file.
  let type = getAppStatus(webapp.metaData.type);
  let isPackaged = false;

  if (webapp.pckManifest) {
    isPackaged = true;

    if (webapp.metaData.origin) {
      errors.push('External webapp `' + webapp.sourceDirectoryName + '` can not have ' +
                  'origin in metadata because is packaged');
      return;
    }
  }

  // Generate the webapp folder name in the profile. Only if it's privileged and it
  // has an origin in its manifest file it'll be able to specify a custom folder name.
  // Otherwise, generate an UUID to use as folder name.
  let uuid = uuidGenerator.generateUUID().toString();
  let webappTargetDirName = uuid;

  if (type == 2 && isPackaged && webapp.pckManifest.origin) {
    let uri = io.newURI(webapp.pckManifest.origin, null, null);
    webappTargetDirName = uri.host;
  }

  let origin = isPackaged ? 'app://' + webappTargetDirName : webapp.metaData.origin;
  if (!origin) {
    origin = 'app://' + webappTargetDirName;
  }

  if (!checkOrigin(origin)) {
    errors.push('External webapp `' + webapp.domain + '` has an invalid ' +
                'origin: ' + origin);
    return;
  }

  let installOrigin = webapp.metaData.installOrigin || origin;
  if (!checkOrigin(installOrigin)) {
    errors.push('External webapp `' + webapp.domain + '` has an invalid ' +
                'installOrigin: ' + installOrigin);
    return;
  }

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

  // Copy webapp's manifest to the profilie
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);

  let removable;

  // In case of packaged app, just copy `application.zip` and `update.webapp`
  if (isPackaged) {
    let updateManifest = webapp.buildDirectoryFile.clone();
    updateManifest.append('update.webapp');
    if (!updateManifest.exists()) {
      errors.push('External packaged webapp `' + webapp.domain + '  is ' +
                  'missing an `update.webapp` file. This JSON file ' +
                  'contains a `package_path` attribute specifying where ' +
                  'to download the application zip package from the origin ' +
                  'specified in `metadata.json` file.');
      return;
    }

    let appPackage = webapp.buildDirectoryFile.clone();
    appPackage.append('application.zip');
    appPackage.copyTo(webappTargetDir, 'application.zip');
    updateManifest.copyTo(webappTargetDir, 'update.webapp');
    removable = ('removable' in webapp.metaData) ? !!webapp.metaData.removable :
                                                    true;
  } else {
    webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');
    removable = ('removable' in webapp.metaData) ? !!webapp.metaData.removable :
                                                    true;

    // This is an hosted app. Check if there is an offline cache.
    let srcCacheFolder = webapp.buildDirectoryFile.clone();
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
    origin: origin,
    installOrigin: installOrigin,
    receipt: null,
    installTime: 132333986000,
    manifestURL: manifestURL,
    removable: removable,
    localId: id++,
    etag: etag,
    packageEtag: packageEtag,
    appStatus: getAppStatus(webapp.metaData.type || 'web')
  };

  webapps[webapp.sourceDirectoryName] = webapp;
  webapps[webapp.sourceDirectoryName].webappsJson = manifests[webappTargetDirName];
}

function cleanProfile(webappsDir) {
  // Profile can contain folders with a generated uuid that need to be deleted
  // or apps will be duplicated.
  let appsDir = webappsDir.directoryEntries;
  var expreg = new RegExp("^{[\\w]{8}-[\\w]{4}-[\\w]{4}-[\\w]{4}-[\\w]{12}}$");
  while (appsDir.hasMoreElements()) {
    let appDir = appsDir.getNext().QueryInterface(Ci.nsIFile);
      if (appDir.leafName.match(expreg)) {
        appDir.remove(true);
      }
  }
}

function execute(options) {
  config = options;

  webappsTargetDir.initWithPath(config.PROFILE_DIR);
  // Create profile folder if doesn't exists
  if (!webappsTargetDir.exists())
    webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
  // Create webapps folder if doesn't exists
  webappsTargetDir.append('webapps');
  if (!webappsTargetDir.exists()) {
    webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
  } else {
    cleanProfile(webappsTargetDir);
  }

  utils.getGaia(config).webapps.forEach(function(webapp) {
    // If BUILD_APP_NAME isn't `*`, we only accept one webapp
    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME) {
      return;
    }

    if (utils.isExternalApp(webapp)) {
      fillExternalAppManifest(webapp);
    } else {
      fillAppManifest(webapp);
    }
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
  utils.writeContent(manifestFile, JSON.stringify(manifests, null, 2) + '\n');

  var mapping = {};
  for (var appname in webapps) {
    mapping[appname] = {};
    // this property contains manifest information before running app-makefiles.
    mapping[appname].originalManifest = webapps[appname].manifest;
    mapping[appname].origin = webapps[appname].webappsJson.origin;
    mapping[appname].manifestURL = webapps[appname].webappsJson.manifestURL;
  }

  let stageFolder = utils.getEnv('STAGE_FOLDER');
  let stageDir;
  if (stageFolder) {
    stageDir = utils.getFile(config.GAIA_DIR, stageFolder);
    utils.ensureFolderExists(stageDir);
  }
  let mappingFile = stageDir.clone();
  mappingFile.append('webapps-mapping.json');
  utils.writeContent(mappingFile, JSON.stringify(mapping, null, 2));

  return webapps;
}

exports.execute = execute;
exports.INSTALL_TIME = INSTALL_TIME;
