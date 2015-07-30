'use strict';

/**
 * This file exports all 'utils' functions, which indeed exports the
 * implementations inside the 'utils-node' and 'utils-xpc' files.
 */

const FILE_TYPE_FILE = 0;
const FILE_TYPE_DIRECTORY = 1;

var utils;
if (isNode()) {
  utils = require('./utils-node.js');
} else {
  utils = require('./utils-xpc.js');
}

/**
 * Detect if we're in Node.js mode.
 *
 * @return {bool}
 */
function isNode() {
  try {
    return process && process.versions && process.versions.node;
  } catch (e) {
    return false;
  }
}

/**
 * Detect if this path is a Mozilla branding logo or L10N resource.
 *
 * @param path {string} - the file path
 * @return {bool}
 */
function isSubjectToBranding(path) {
  return /shared[\/\\]?[a-zA-Z]*[\/\\]?branding$/.test(path) ||
         /branding[\/\\]initlogo.png/.test(path);
}

// XXX: We should use @formFactor for device specific L10N support,
// isSubjectToDeviceType should be removed after bug 936532 landed.
/**
 * Detect if this path is a device specific L10N resource.
 *
 * @param path {string} - the file path
 * @return {bool}
 */
function isSubjectToDeviceType(path) {
  return /locales[\/\\]?[a-zA-Z\/]*[\/\\]?device_type/.test(path);
}

/**
 * Get file extension from a name.
 *
 * @return string: the extension name
 */
function getExtension(filename) {
  return filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
}

/**
 * We parse list like ps aux and b2g-ps into object
 * ex: root 24692 nginx -> {
 *     user: 'root',
 *     pid: '24692',
 *     command: 'nginx'
 * }
 *
 * @param psresult {string} - the result of `ps` command.
 * @return object - {ps title: ps column content}
 */
function psParser(psresult) {
  var rows = psresult.split('\n');
  if (rows.length < 2) {
    return {};
  }

  // We use indexes of each title of the first row to
  // get correct position of each values.
  // We don't use split(' ') here, because some app name
  // may contain white space, ex. FM Radio.
  var titles = rows[0].trim().split(/\s+/);
  var titleIndexes = titles.map(function(name) {
    return rows[0].indexOf(name);
  });
  var result = {};

  for (var r = 1; r < rows.length; r++) {
    var name =
      rows[r].slice(titleIndexes[0], titleIndexes[1]).
      trim();
    result[name] = {};
    for (var i = 1; i < titleIndexes.length; i++) {
      var value =
        rows[r].slice(titleIndexes[i], titleIndexes[i + 1]);
      if(value[0] !== ' ') {
        value = rows[r].slice(titleIndexes[i] - 1,
                              titleIndexes[i + 1] && titleIndexes[i + 1] - 1);
      }
      value = value.trim();
      result[name][titles[i]] = value;
    }
  }
  return result;
}

/**
 * Concat to Gaia URL original like:
 * 'app://system.gaiamobile.org'
 *
 * @param name {string} - the app name
 * @param scheme {string} - the scheme, like 'app://' or 'http://'
 * @param domain {string} - the domain for Gaia, like 'gaiamobile.org'
 * @param port {string} - the port, but we don't use it
 * @return {string}
 */
function gaiaOriginURL(name, scheme, domain, port) {
  return scheme + name + '.' + domain;
}

/**
 * Give the default app manifest URL like:
 * 'app://system.gaiamobile.org:8080/manifest.webapp'
 *
 * In fact, what we do is only to append the '/manifest.webapp'
 * to the origin URL.
 *
 * @param name {string} - the app name
 * @param scheme {string} - the scheme, like 'app://' or 'http://'
 * @param domain {string} - the domain for Gaia, like 'gaiamobile.org'
 * @param port {string} - the port, like 8080 or '8080'
 * @return {string}
 */
function gaiaManifestURL(name, scheme, domain, port) {
  return gaiaOriginURL(name, scheme, domain, port) + '/manifest.webapp';
}

/**
 * To see if the app status is 'certified', 'privileged' or 'web',
 * and give the corresponding status code:
 *
 * 'certified': 3,
 * 'privileged': 2,
 * 'web': 1
 *
 * @param status {string} - 'certified', 'privileged' or 'web'
 * @return {number} - 3, 2 or 1
 */
function getAppStatus(status) {
  var appStatus;
  switch (status) {
    case 'certified':
      appStatus = 3;
      break;
    case 'privileged':
      appStatus = 2;
      break;
    case 'web':
      appStatus = 1;
      break;
    default: // By default, apps are installed
      appStatus = 1;
      break;
  }
  return appStatus;
}

/**
 * Serialize an object, then parse it as a cloned, new object.
 *
 * @param obj {object}
 * @return {object} - the cloned new object
 */
function cloneJSON(obj) {
  var result = null;
  try {
    result = JSON.parse(JSON.stringify(obj));
  } catch (e) {
    throw new Error('Its type is not supported JSON format.');
  }
  return result;
}

/**
 * Compare contents of two JavaScript scripts.
 *
 * @param jsa {string}
 * @param jsb {string}
 * @return {bool} - if they're strictly equal
 */
function jsComparator(jsa, jsb) {
  try {
    var jsaPrsed = JSON.stringify(utils.scriptParser(jsa, {loc: 0}));
    var jsbPrsed = JSON.stringify(utils.scriptParser(jsb, {loc: 0}));
    return jsaPrsed === jsbPrsed;
  } catch (e) {
    throw e;
  }
}

/**
 * convert BUILD_APP_NAME to regular expression and automatically convert to
 * /.+/ if BUILD_APP_NAME is *
 *
 * @param buildAppName {string} BUILD_APP_NAME from Makefile
 *
 * @return {RegExp}             a RegExp object
 */
function getAppNameRegex(buildAppName) {
  return buildAppName === '*' ? /.+/ : new RegExp(buildAppName);
}


function serializeDocument(doc) {
  // the doctype string should always be '<!DOCTYPE html>' but just in case...
  var doctypeStr = '';
  var dt = doc.doctype;
  if (dt && dt.name) {
    doctypeStr = '<!DOCTYPE ' + dt.name;
    if (dt.publicId) {
      doctypeStr += ' PUBLIC ' + dt.publicId;
    }
    if (dt.systemId) {
      doctypeStr += ' ' + dt.systemId;
    }
    doctypeStr += '>\n';
  }

  // outerHTML breaks the formating, so let's use innerHTML instead
  var htmlStr = '<html';
  var docElt = doc.documentElement;
  var attrs = docElt.attributes;
  for (var i = 0; i < attrs.length; i++) {
    htmlStr += ' ' + attrs[i].nodeName.toLowerCase() +
               '="' + attrs[i].nodeValue + '"';
  }
  var innerHTML = docElt.innerHTML.replace(/  \n*<\/body>\n*/, '  </body>\n');
  htmlStr += '>\n  ' + innerHTML + '\n</html>\n';

  return doctypeStr + htmlStr;
}

function makeWebappsObject(appdirs, config) {
  var apps = [];
  appdirs.forEach(function(app) {
    var webapp = utils.getWebapp(app, config);
    if (webapp) {
      apps.push(webapp);
    }
  });
  return apps;
}

/**
 * Information of Gaia building session. For example, if we `getInstance`
 * from it, the result would be:
 * {
 *    stageDir: the path of the `build_stage` directory,
 *    engine: 'firefox' or 'b2g'
 *    ...
 *    distributionDir: the path of the `distribution` directory
 * }
 */
var gaia = {
  config: {},
  aggregatePrefix: 'gaia_build_',
  getInstance: function(config) {
    if (JSON.stringify(this.config) !== JSON.stringify(config) ||
      !this.instance) {
      config.rebuildAppDirs = config.rebuildAppDirs || [];
      this.config = config;
      this.instance = {
        stageDir: utils.getFile(this.config.STAGE_DIR),
        engine: this.config.GAIA_ENGINE,
        sharedFolder: utils.getFile(this.config.GAIA_DIR, 'shared'),
        webapps: makeWebappsObject(this.config.GAIA_APPDIRS.split(' '),
                                   this.config),
        rebuildWebapps: makeWebappsObject(this.config.rebuildAppDirs,
                                          this.config),
        distributionDir: this.config.GAIA_DISTRIBUTION_DIR
      };
    }
    return this.instance;
  }
};


exports.Q = utils.Q;
exports.isSubjectToBranding = isSubjectToBranding;
exports.isSubjectToDeviceType = isSubjectToDeviceType;
exports.ls = utils.ls;
exports.getFileContent = utils.getFileContent;
exports.writeContent = utils.writeContent;
exports.getFile = utils.getFile;
exports.ensureFolderExists = utils.ensureFolderExists;
exports.getJSON = utils.getJSON;
exports.getFileAsDataURI = utils.getFileAsDataURI;
exports.gaiaOriginURL = gaiaOriginURL;
exports.gaiaManifestURL = gaiaManifestURL;
exports.getDistributionFileContent = utils.getDistributionFileContent;
exports.resolve = utils.resolve;
exports.gaia = gaia;
exports.getBuildConfig = utils.getBuildConfig;
exports.getAppsByList = utils.getAppsByList;
exports.getApp = utils.getApp;
exports.getAppName = utils.getAppName;
exports.getXML = utils.getXML;
exports.getTempFolder = utils.getTempFolder;
exports.normalizeString = utils.normalizeString;
exports.Commander = utils.Commander;
exports.getEnvPath = utils.getEnvPath;
exports.getLocaleBasedir = utils.getLocaleBasedir;
exports.getNewURI = utils.getNewURI;
exports.getOsType = utils.getOsType;
exports.generateUUID = utils.generateUUID;
exports.copyRec = utils.copyRec;
exports.getAppStatus = getAppStatus;
exports.createZip = utils.createZip;
exports.closeZip = utils.closeZip;
exports.hasFileInZip = utils.hasFileInZip;
exports.scriptParser = utils.scriptParser;
exports.scriptLoader = utils.scriptLoader;
exports.FILE_TYPE_FILE = FILE_TYPE_FILE;
exports.FILE_TYPE_DIRECTORY = FILE_TYPE_DIRECTORY;
exports.deleteFile = utils.deleteFile;
exports.listFiles = utils.listFiles;
exports.psParser = psParser;
exports.fileExists = utils.fileExists;
exports.mkdirs = utils.mkdirs;
exports.joinPath = utils.joinPath;
exports.copyFileTo = utils.copyFileTo;
exports.copyToStage = utils.copyToStage;
exports.createXMLHttpRequest = utils.createXMLHttpRequest;
exports.download = utils.download;
exports.downloadJSON = utils.downloadJSON;
exports.readJSONFromPath = utils.readJSONFromPath;
exports.readZipManifest = utils.readZipManifest;
exports.writeContentToFile = utils.writeContentToFile;
exports.processEvents = utils.processEvents;
exports.log = utils.log;
exports.getExtension = getExtension;
exports.killAppByPid = utils.killAppByPid;
exports.getEnv = utils.getEnv;
exports.setEnv = utils.setEnv;
exports.spawnProcess = utils.spawnProcess;
exports.processIsRunning = utils.processIsRunning;
exports.getProcessExitCode = utils.getProcessExitCode;
exports.isExternalApp = utils.isExternalApp;
exports.getDocument = utils.getDocument;
exports.getUUIDMapping = utils.getUUIDMapping;
exports.getWebapp = utils.getWebapp;
exports.Services = utils.Services;
exports.concatenatedScripts = utils.concatenatedScripts;
exports.dirname = utils.dirname;
exports.basename = utils.basename;
exports.addFileToZip = utils.addFileToZip;
exports.copyDirTo = utils.copyDirTo;
exports.existsInAppDirs = utils.existsInAppDirs;
exports.getCompression = utils.getCompression;
exports.removeFiles = utils.removeFiles;
exports.getAppNameRegex = getAppNameRegex;
exports.serializeDocument = serializeDocument;
exports.cloneJSON = cloneJSON;
exports.jsComparator = jsComparator;
exports.NodeHelper = utils.NodeHelper;
exports.relativePath = utils.relativePath;
exports.normalizePath = utils.normalizePath;
exports.getMD5hash = utils.getMD5hash;
