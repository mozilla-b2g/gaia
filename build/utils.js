const { Cc, Ci, Cr, Cu } = require('chrome');
const FILE_TYPE_FILE = 0;
const FILE_TYPE_DIRECTORY = 1;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://gre/modules/osfile.jsm")

function isSubjectToBranding(path) {
  return /shared[\/\\][a-zA-Z]+[\/\\]branding$/.test(path) ||
         /branding[\/\\]initlogo.png/.test(path);
}

/**
 * Returns an array of nsIFile's for a given directory
 *
 * @param  {nsIFile} dir       directory to read.
 * @param  {boolean} recursive set to true in order to walk recursively.
 * @param  {RegExp}  exclude   optional filter to exclude file/directories.
 *
 * @return {Array}   list of nsIFile's.
 */
function ls(dir, recursive, exclude) {
  let results = [];
  if (!dir.exists()) {
    return results;
  }

  let files = dir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (!exclude || !exclude.test(file.leafName)) {
      results.push(file);
      if (recursive && file.isDirectory()) {
        results = results.concat(ls(file, true, exclude));
      }
    }
  }
  return results;
}

function getFileContent(file) {
  try {
    let fileStream = Cc['@mozilla.org/network/file-input-stream;1']
                     .createInstance(Ci.nsIFileInputStream);
    fileStream.init(file, 1, 0, false);

    let converterStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                            .createInstance(Ci.nsIConverterInputStream);
    converterStream.init(fileStream, 'utf-8', fileStream.available(),
        Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

    let out = {};
    let count = fileStream.available();
    converterStream.readString(count, out);

    var content = out.value;
    converterStream.close();
    fileStream.close();
  } catch (e) {
    let msg = (file && file.path) ? '\nfile not found: ' + file.path : '';
    throw new Error(' -*- build/utils.js: ' + e + msg + '\n');
  }
  return content;
}

function writeContent(file, content) {
  var fileStream = Cc['@mozilla.org/network/file-output-stream;1']
                     .createInstance(Ci.nsIFileOutputStream);
  fileStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

  let converterStream = Cc['@mozilla.org/intl/converter-output-stream;1']
                          .createInstance(Ci.nsIConverterOutputStream);

  converterStream.init(fileStream, 'utf-8', 0, 0);
  converterStream.writeString(content);
  converterStream.close();
}

// Return an nsIFile by joining paths given as arguments
// First path has to be an absolute one
function getFile() {
  try {
    let file = new FileUtils.File(arguments[0]);
    if (arguments.length > 1) {
      for (let i = 1; i < arguments.length; i++) {
        let dir = arguments[i];
        dir.split('/').forEach(function(name) {
          file.append(name);
        });
      }
    }
    return file;
  } catch (e) {
    throw new Error(' -*- build/utils.js: Invalid file path (' +
                    Array.slice(arguments).join(', ') + ')\n' + e + '\n');
  }
}

function ensureFolderExists(file) {
  if (!file.exists()) {
    try {
      file.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
    } catch (e if e.result == Cr.NS_ERROR_FILE_ALREADY_EXISTS) {
      // Bug 808513: Ignore races between `if exists() then create()`.
      return;
    }
  }
}

function getJSON(file) {
  try {
    let content = getFileContent(file);
    return JSON.parse(content);
  } catch (e) {
    dump('Invalid JSON file : ' + file.path + '\n');
    throw e;
  }
}

function makeWebappsObject(appdirs, domain, scheme, port) {
  return {
    forEach: function(fun) {
      appdirs.forEach(function(app) {
        let appDir = getFile(app);
        if (!appDir.exists()) {
          throw new Error(' -*- build/utils.js: file not found (' + app + ')\n');
        }

        let manifestFile = appDir.clone();
        manifestFile.append('manifest.webapp');

        let updateFile = appDir.clone();
        updateFile.append('update.webapp');

        // Ignore directories without manifest
        if (!manifestFile.exists() && !updateFile.exists()) {
          return;
        }

        let manifest = manifestFile.exists() ? manifestFile : updateFile;

        // Use the folder name as the the domain name
        let appDomain = appDir.leafName + '.' + domain;
        let webapp = {
          manifest: getJSON(manifest),
          manifestFile: manifest,
          url: scheme + appDomain + (port ? port : ''),
          domain: appDomain,
          sourceDirectoryFile: manifestFile.parent,
          buildDirectoryFile: manifestFile.parent,
          sourceDirectoryName: appDir.leafName,
          sourceAppDirectoryName: appDir.parent.leafName
        };

        // External webapps have a `metadata.json` file
        let metaData = webapp.sourceDirectoryFile.clone();
        metaData.append('metadata.json');
        if (metaData.exists()) {
          webapp.metaData = getJSON(metaData);
        }

        // Some webapps control their own build
        let buildMetaData = webapp.sourceDirectoryFile.clone();
        buildMetaData.append('gaia_build.json');
        if (buildMetaData.exists()) {
          webapp.build = getJSON(buildMetaData);

          if (webapp.build.dir) {
            let buildDirectoryFile = webapp.sourceDirectoryFile.clone();
            webapp.build.dir.split('/').forEach(function(segment) {
              if (segment == "..")
                buildDirectoryFile = buildDirectoryFile.parent;
              else
                buildDirectoryFile.append(segment);
            });

            webapp.buildDirectoryFile = buildDirectoryFile;
          }
        }

        fun(webapp);
      });
    }
  };
}

function registerProfileDirectory(profileDir) {
  let directoryProvider = {
    getFile: function provider_getFile(prop, persistent) {
      persistent.value = true;
      if (prop != 'ProfD' && prop != 'ProfLDS') {
        throw Cr.NS_ERROR_FAILURE;
      }

      return new FileUtils.File(profileDir);
    },

    QueryInterface: XPCOMUtils.generateQI([Ci.nsIDirectoryServiceProvider,
                                           Ci.nsISupports])
  };

  Cc['@mozilla.org/file/directory_service;1']
    .getService(Ci.nsIProperties)
    .QueryInterface(Ci.nsIDirectoryService)
    .registerProvider(directoryProvider);
}

function getGaia(options) {
  return {
    engine: options.GAIA_ENGINE,
    sharedFolder: getFile(options.GAIA_DIR, 'shared'),
    webapps: makeWebappsObject(options.GAIA_APPDIRS.split(' '),
      options.GAIA_DOMAIN, options.GAIA_SCHEME, options.GAIA_PORT),
    aggregatePrefix: 'gaia_build_',
    distributionDir: options.GAIA_DISTRIBUTION_DIR
  };
}

function gaiaOriginURL(name, scheme, domain, port) {
  return scheme + name + '.' + domain + (port ? port : '');
}

function gaiaManifestURL(name, scheme, domain, port) {
  return gaiaOriginURL(name, scheme, domain, port) + '/manifest.webapp';
}

function getDistributionFileContent(name, defaultContent, distDir) {
  if (distDir) {
    let distributionFile = getFile(distDir, name + '.json');
    if (distributionFile.exists()) {
      return getFileContent(distributionFile);
    }
  }
  return JSON.stringify(defaultContent, null, '  ');
}

function getAbsoluteOrRelativePath(path, gaiaDir) {
  // First check relative path to gaia folder
  let abs_path_chunks = [gaiaDir].concat(path.split(/\/|\\/));
  let file = getFile.apply(null, abs_path_chunks);
  if (!file.exists()) {
    try {
      // Then check absolute path
      return getFile(path);
    } catch (e) {}
  }
  return file;
}

/**
 * Delete the specified file path.
 *
 * @param  {boolean} recursive set to true in order to delete recursively.
 * Note: this function is a wrapper function  for node.js
 */
function deleteFile(path, recursive) {
  var file = getFile(path);
  if (file.exists()) {
    file.remove(recursive === true);
  }
}

/**
 *
 * Returns an array of file name's for a given directory
 *
 * @param  {string} path       directory to read.
 * @param  {int}    type       FILE_TYPE_FILE for files,
 *                             FILE_TYPE_DIRECTORY for directories
 * @param  {boolean} recursive set to true in order to walk recursively.
 * @param  {RegExp}  exclude   optional filter to exclude file/directories.
 *
 * @return {Array}   list of string which contains all files' full path.
 * Note: this function is a wrapper function  for node.js
 */
function listFiles(path, type, recursive, exclude) {
  var file = getFile(path);
  if (!file.isDirectory()) {
    throw new Error('the path is not a directory.');
  }
  var files = ls(file, recursive === true, exclude);
  var detectFunc = (type === 0 ? 'isFile' : 'isDirectory');
  // To return simple JavaScript type, We need to put the file path to the array
  // instead of nsIFile.
  var results = [];
  files.forEach(function(file) {
    if (file[detectFunc]()) {
      results.push(file.path);
    }
  });

  return results;
}

/**
 * check if a file or directory exists.
 * Note: this function is a wrapper function  for node.js
 */
function fileExists(path) {
  return getFile(path).exists();
}

/**
 * create dir and its parents.
 * Note: this function is a wrapper function  for node.js
 */
function mkdirs(path) {
  ensureFolderExists(getFile(path));
}

/**
 * join all path.
 * Note: this function is a wrapper function  for node.js
 */
function joinPath() {
  return OS.Path.join.apply(OS.Path, arguments);
}

/**
 * copy path to parentPath/name.
 * @param  {string}  path       directory to be copied,
 * @param  {string}  toParent   the parent folder of destination,
 * @param  {string}  name       the parent folder of destination,
 * @param  {boolean} override   set to true to overwride it if it is existed.

 * Note: this function is a wrapper function for node.js
 */
function copyFileTo(path, toParent, name, override) {
  var file = getFile(path);
  var parentFile = getFile(toParent);
  ensureFolderExists(parentFile);
  if (override) {
    var toFile = getFile(toParent, name);
    if (toFile.exists()) {
      toFile.remove(true);
    }
  }
  file.copyTo(parentFile, name);
}

/**
 * create standard XMLHttpRequest object.
 * Note: this function is a wrapper function  for node.js
 */
function createXMLHttpRequest() {
  let XMLHttpRequest = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'];

  var ret = new XMLHttpRequest();
  ret.mozBackgroundRequest = true;
  return ret;
}

/**
 * download JSON file from internet
 * Note: this function is a wrapper function  for node.js
 */
function downloadJSON(url, callback) {
  var xhr = createXMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        callback(JSON.parse(xhr.responseText));
      } else if (url.substring(0, 5) === 'https') {
        // if error with https, fallback to http mode.
        downloadJSON('http' + url.substring(5), callback);
      } else {
        callback(null);
      }
    }
  };
  xhr.send();
}


/**
 * read JSON object from path, if the path is folder, it returns null.
 * Note: this function is a wrapper for node.js
 */
function readJSONFromPath(path) {
  var file = getFile(path);
  if (file.isFile()) {
    return getJSON(file);
  } else {
    throw new Error('The path is not a file.');
  }
}

/**
 * write content to a file
 * Note: this function is a wrapper for node.js
 */
function writeContentToFile(path, content) {
  writeContent(getFile(path), content);
}

/**
 * To have XPCShell working, this function pumps the event for current thread.
 * @param  {function}  exitResultFunc it should return an object for exit
 *                     information:
 *         {
 *           wait: true, // a boolean to indicate we need to wait or not.
 *           error: null // an Error object or null to indicate an error should
 *                       // be thrown to outside.
 *         }
 * Note: this function is a wrapper for node.js
 */
function processEvents(exitResultFunc) {
  let thread = Services.tm.currentThread;
  let exitResult;
  do {
    exitResult = exitResultFunc();
    thread.processNextEvent(true);
  } while(thread.hasPendingEvents() || exitResult.wait);
  if (exitResult.error) {
    throw exitResult.error;
  }
}

/**
 * Simple log with the following format [tag] msg1 msg2. The first argument is
 * used as tag.
 */
function log(/*tag, ...*/) {
  if (!arguments.length) {
    dump('\n');
    return;
  }
  var msg = '[' + arguments[0] + ']';
  for(var i = 1; i < arguments.length; i++) {
    msg += ' ' + arguments[i];
  }
  dump(msg + '\n');
}

exports.isSubjectToBranding = isSubjectToBranding;
exports.ls = ls;
exports.getFileContent = getFileContent;
exports.writeContent = writeContent;
exports.getFile = getFile;
exports.ensureFolderExists = ensureFolderExists;
exports.getJSON = getJSON;
exports.makeWebappsObject = makeWebappsObject;
exports.gaiaOriginURL = gaiaOriginURL;
exports.gaiaManifestURL = gaiaManifestURL;
exports.getDistributionFileContent = getDistributionFileContent;
exports.getAbsoluteOrRelativePath = getAbsoluteOrRelativePath;
exports.getGaia = getGaia;
// ===== the following functions support node.js compitable interface.
exports.FILE_TYPE_FILE = FILE_TYPE_FILE;
exports.FILE_TYPE_DIRECTORY = FILE_TYPE_DIRECTORY;
exports.deleteFile = deleteFile;
exports.listFiles = listFiles;
exports.fileExists = fileExists;
exports.mkdirs = mkdirs;
exports.joinPath = joinPath;
exports.copyFileTo = copyFileTo;
exports.createXMLHttpRequest = createXMLHttpRequest;
exports.downloadJSON = downloadJSON;
exports.readJSONFromPath = readJSONFromPath;
exports.writeContentToFile = writeContentToFile;
exports.processEvents = processEvents;
exports.log = log;
