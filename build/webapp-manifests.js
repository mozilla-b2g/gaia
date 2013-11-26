var utils = require('./utils');
var config;
const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');

const INSTALL_TIME = 132333986000;
// Match this to value in applications-data.js

function debug(msg) {
//  dump('-*- webapp-manifest.js: ' + msg + '\n');
}

let io = Cc['@mozilla.org/network/io-service;1']
           .getService(Ci.nsIIOService);

let webappsTargetDir = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);
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

function fillCommsAppManifest(webapp, webappTargetDir) {
  let manifestContent = utils.getFileContent(webapp.manifestFile);
  var manifestObject = JSON.parse(manifestContent);

  let redirects = manifestObject.redirects;

  let indexedRedirects = {};
  redirects.forEach(function(aRedirect) {
    indexedRedirects[aRedirect.from] = aRedirect.to;
  });

  let mappingParameters = {
    'facebook': 'redirectURI',
    'live': 'redirectURI',
    'gmail': 'redirectURI',
    'facebook_dialogs': 'redirectMsg',
    'facebook_logout': 'redirectLogout'
  };

  let content = JSON.parse(utils.getFileContent(utils.getFile(config.GAIA_DIR,
    'build', 'communications_services.json')));
  let custom = utils.getDistributionFileContent('communications_services',
    content);
  let commsServices = JSON.parse(custom);

  let newRedirects = [];
  redirects.forEach(function(aRedirect) {
    let from = aRedirect.from;
    let service = commsServices[from.split('_')[0] || from] || commsServices;
    newRedirects.push({
      from: service[mappingParameters[from]],
      to: indexedRedirects[from]
    });
  });

  manifestObject.redirects = newRedirects;

  debug(webappTargetDir.path);

  let file = utils.getFile(webappTargetDir.path, 'manifest.webapp');
  utils.writeContent(file, JSON.stringify(manifestObject));
}

function fillAppManifest(webapp) {
  // Compute webapp folder name in profile
  let webappTargetDirName = webapp.domain;

  // Copy webapp's manifest to the profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);
  webapp.manifestFile.copyTo(webappTargetDir, 'manifest.webapp');

  if (webapp.url.indexOf('communications.gaiamobile.org') !== -1) {
    fillCommsAppManifest(webapp, webappTargetDir);
  }
  else if (webapp.url.indexOf('://keyboard.gaiamobile.org') !== -1) {
    let kbdConfig = require('keyboard-config');
    let kbdManifest = utils.getJSON(webapp.manifestFile);
    kbdManifest = kbdConfig.addEntryPointsToManifest(config, kbdManifest);
    utils.writeContent(utils.getFile(webappTargetDir.path, 'manifest.webapp'),
                       JSON.stringify(kbdManifest));
  }

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
}


let errors = [];

function fillExternalAppManifest(webapp) {
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
  let appPackage = webapp.buildDirectoryFile.clone();
  appPackage.append('application.zip');
  if (appPackage.exists()) {
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
}

function execute(options) {
  config = options;

  webappsTargetDir.initWithPath(config.PROFILE_DIR);
  // Create profile folder if doesn't exists
  if (!webappsTargetDir.exists())
    webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
  // Create webapps folder if doesn't exists
  webappsTargetDir.append('webapps');
  if (!webappsTargetDir.exists())
    webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));

  utils.getGaia(config).webapps.forEach(function(webapp) {
    // If BUILD_APP_NAME isn't `*`, we only accept one webapp
    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME) {
      return;
    }

    if (webapp.metaData) {
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

}

exports.execute = execute;
