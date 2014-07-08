
const FILE_TYPE_FILE = 0;
const FILE_TYPE_DIRECTORY = 1;

var utils;
if (isNode()) {
  utils = require('./utils-node.js');
} else {
  utils = require('./utils-xpc.js');
}


function isNode() {
  try {
    return process && process.versions && process.versions.node;
  } catch (e) {
    return false;
  }
}

function isSubjectToBranding(path) {
  return /shared[\/\\]?[a-zA-Z]*[\/\\]?branding$/.test(path) ||
         /branding[\/\\]initlogo.png/.test(path);
}

function getExtension(filename) {
  return filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
}

// We parse list like ps aux and b2g-ps into object
function psParser(out) {
  var rows = out.split('\n');
  if (rows.length < 2)
    return {};

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

function gaiaOriginURL(name, scheme, domain, port) {
  return scheme + name + '.' + domain;
}

function gaiaManifestURL(name, scheme, domain, port) {
  return gaiaOriginURL(name, scheme, domain, port) + '/manifest.webapp';
}

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
    default: // By default, apps are installed
      appStatus = 1;
      break;
  }
  return appStatus;
}

function cloneJSON(obj) {
  var result = null;
  try {
    result = JSON.parse(JSON.stringify(obj));
  } catch (e) {
    throw new Error('Its type is not supported JSON format.');
  }
  return result;
}

// Compare contents of two js scripts.
function jsComparator(jsa, jsb) {
  try {
    var jsaPrsed = JSON.stringify(utils.scriptParser(jsa, {loc: 0}));
    var jsbPrsed = JSON.stringify(utils.scriptParser(jsb, {loc: 0}));
    return jsaPrsed === jsbPrsed;
  } catch (e) {
    throw e;
  }
}

exports.Q = utils.Q;
exports.isSubjectToBranding = isSubjectToBranding;
exports.ls = utils.ls;
exports.getFileContent = utils.getFileContent;
exports.writeContent = utils.writeContent;
exports.getFile = utils.getFile;
exports.ensureFolderExists = utils.ensureFolderExists;
exports.getJSON = utils.getJSON;
exports.getFileAsDataURI = utils.getFileAsDataURI;
exports.makeWebappsObject = utils.makeWebappsObject;
exports.gaiaOriginURL = gaiaOriginURL;
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
exports.getAppStatus = getAppStatus;
exports.createZip = utils.createZip;
exports.scriptLoader = utils.scriptLoader;
exports.scriptParser = utils.scriptParser;
// ===== the following functions support node.js compitable interface.
exports.FILE_TYPE_FILE = FILE_TYPE_FILE;
exports.FILE_TYPE_DIRECTORY = FILE_TYPE_DIRECTORY;
exports.deleteFile = utils.deleteFile;
exports.listFiles = utils.listFiles;
exports.psParser = psParser;
exports.fileExists = utils.fileExists;
exports.mkdirs = utils.mkdirs;
exports.joinPath = utils.joinPath;
exports.copyFileTo = utils.copyFileTo;
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
exports.isExternalApp = utils.isExternalApp;
exports.getDocument = utils.getDocument;
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
exports.cloneJSON = cloneJSON;
exports.jsComparator = jsComparator;
