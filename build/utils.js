/**
 * This file exports all 'utils' functions, which indeed exports the
 * implementations inside the 'utils-node' and 'utils-xpc' files.
 */

'use strict';
/* global exports, require, process*/
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

/**
 * NodeJS library Q for promise.
 * @exports Q
 */
exports.Q = utils.Q;

/**
 * Common function.
 * @exports isSubjectToBranding
 */
exports.isSubjectToBranding = isSubjectToBranding;
exports.isSubjectToDeviceType = isSubjectToDeviceType;
exports.ls = utils.ls;
exports.getFileContent = utils.getFileContent;
exports.writeContent = utils.writeContent;
exports.getFile = utils.getFile;
exports.ensureFolderExists = utils.ensureFolderExists;
exports.getJSON = utils.getJSON;
exports.getFileAsDataURI = utils.getFileAsDataURI;

/**
 * Common function.
 * @exports gaiaOriginURL
 */
exports.gaiaOriginURL = gaiaOriginURL;

/**
 * Common function.
 * @exports gaiaManifestURL
 */
exports.gaiaManifestURL = gaiaManifestURL;
exports.getDistributionFileContent = utils.getDistributionFileContent;
exports.resolve = utils.resolve;
exports.gaia = utils.gaia;
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

/**
 * Common function.
 * @exports getAppStatus
 */
exports.getAppStatus = getAppStatus;
exports.createZip = utils.createZip;
exports.scriptParser = utils.scriptParser;
// ===== the following functions support node.js compitable interface.
exports.scriptLoader = utils.scriptLoader;
exports.FILE_TYPE_FILE = FILE_TYPE_FILE;
exports.FILE_TYPE_DIRECTORY = FILE_TYPE_DIRECTORY;
exports.deleteFile = utils.deleteFile;
exports.listFiles = utils.listFiles;

/**
 * Common function.
 * @exports psParser
 */
exports.psParser = psParser;
exports.fileExists = utils.fileExists;
exports.mkdirs = utils.mkdirs;
exports.joinPath = utils.joinPath;
exports.copyFileTo = utils.copyFileTo;
exports.copyToStage = utils.copyToStage;
exports.createXMLHttpRequest = utils.createXMLHttpRequest;
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
exports.getProcess = utils.getProcess;
exports.isExternalApp = utils.isExternalApp;
exports.getDocument = utils.getDocument;
exports.getUUIDMapping = utils.getUUIDMapping;
exports.getWebapp = utils.getWebapp;
exports.Services = utils.Services;
exports.concatenatedScripts = utils.concatenatedScripts;
exports.dirname = utils.dirname;
exports.basename = utils.basename;
exports.addEntryContentWithTime = utils.addEntryContentWithTime;
exports.copyDirTo = utils.copyDirTo;
exports.existsInAppDirs = utils.existsInAppDirs;
exports.getCompression = utils.getCompression;
exports.removeFiles = utils.removeFiles;
exports.getMD5hash = utils.getMD5hash;
exports.getAppNameRegex = getAppNameRegex;
exports.serializeDocument = serializeDocument;
/**
 * Common function.
 * @exports cloneJSON
 */
exports.cloneJSON = cloneJSON;

/**
 * Common function.
 * @exports jsComparator
 */
exports.jsComparator = jsComparator;
