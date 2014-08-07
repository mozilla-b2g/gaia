'use strict';

/* global require, Services, dump, FileUtils, exports, OS, Promise, Reflect */
/* jshint -W079, -W118 */

const { Cc, Ci, Cr, Cu, CC } = require('chrome');
const { btoa } = Cu.import('resource://gre/modules/Services.jsm', {});

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/reflect.jsm');

var utils = require('./utils.js');
var subprocess = require('sdk/system/child_process/subprocess');
/**
 * Returns an array of nsIFile's for a given directory
 *
 * @param  {nsIFile} dir       directory to read.
 * @param  {boolean} recursive set to true in order to walk recursively.
 * @param  {RegExp}  exclude   optional filter to exclude file/directories.
 *
 * @returns {Array}   list of nsIFile's.
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

function getNewURI(uriString, uriCharset, baseURI) {
  return Services.io.newURI(uriString, uriCharset, baseURI);
}

function getOsType() {
  return Cc['@mozilla.org/xre/app-info;1']
          .getService(Ci.nsIXULRuntime).OS;
}

function isExternalApp(webapp) {
  if (webapp.metaData && webapp.metaData.external === undefined) {
    throw new Error('"external" property in metadata.json is required since ' +
      'Firefox OS 2.1, please add it into metadata.json and update ' +
      'preload.py if you use this script to perload your apps. If you ' +
      'created metadata.json for non-external apps, please set "external" to ' +
      'false. your metadata.json is in ' + webapp.sourceDirectoryFile.path);
  }
  if (!webapp.metaData || webapp.metaData.external === false) {
    return false;
  } else {
    return true;
  }
}

/**
 * Read the file and output as an UTF-8 string.
 *
 * @param file {nsIFile} - the File object.
 * @return {string}
 */
function getFileContent(file) {
  var content;
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

    content = out.value;
    converterStream.close();
    fileStream.close();
  } catch (e) {
    let msg = (file && file.path) ? '\nfile not found: ' + file.path : '';
    throw new Error(' -*- build/utils.js: ' + e + msg + '\n');
  }
  return content;
}

/**
 * Write content to file, if the file doesn't exist, the it will auto create one
 *
 * @param file {nsIFile} - the file object
 * @param content {string} - would write it as string to string
 */
function writeContent(file, content) {
  try {
    var fileStream = Cc['@mozilla.org/network/file-output-stream;1']
                       .createInstance(Ci.nsIFileOutputStream);
    fileStream.init(file, 0x02 | 0x08 | 0x20, parseInt('0666', 8), 0);

    let converterStream = Cc['@mozilla.org/intl/converter-output-stream;1']
                            .createInstance(Ci.nsIConverterOutputStream);

    converterStream.init(fileStream, 'utf-8', 0, 0);
    converterStream.writeString(content);
    converterStream.close();
  } catch (e) {
    dump('writeContent error, file.path: ' + file.path + '\n');
    throw(e);
  }
}

/**
 * Return an nsIFile by joining paths given as arguments
 * First path has to be an absolute one.
 *
 * The file path should be separated paths like:
 * getFile('/Users/foo', 'bar', 'car.js')
 *
 * Note we don't support '../foo/bar.js', since the first
 * argument must be absolute path.
 *
 * @return {nsIFile}
 */
function getFile() {
  try {
    let file = new FileUtils.File(arguments[0]);
    if (arguments.length > 1) {
      let args = Array.prototype.slice.call(arguments, 1);
      args.forEach(function(dir) {
        dir.split(/[\\\/]/).forEach(function(name) {
          if (name === '..') {
            file = file.parent;
          } else {
            file.append(name);
          }
        });
      });
    }
    return file;
  } catch (e) {
    throw new Error(' -*- build/utils.js: Invalid file path (' +
                    Array.slice(arguments).join(', ') + ')\n' + e + '\n');
  }
}

/**
 * Give a File object for the directory.
 * If it doesn't exist, create it.
 *
 * @param file {nsIFile} - the object
 */
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

/**
 * Concat scripts and put it to the target path.
 *
 * @param scriptsPaths {[string]} - the paths of the script files
 * @param targetPath {string}
 */
function concatenatedScripts(scriptsPaths, targetPath) {
  var concatedScript = scriptsPaths.map(function(path) {
    return getFileContent(getFile.apply(this, path));
  }).join('\n');

  var targetFile = getFile(targetPath);
  ensureFolderExists(targetFile.parent);

  writeContent(targetFile, concatedScript);
}

/**
 * Get one JSON file's content and parse it as object.
 * @param file {nsIFile} - the file object
 * @return {object} - the parsed object
 */
function getJSON(file) {
  let content;
  try {
    content = getFileContent(file);
    return JSON.parse(content);
  } catch (e) {
    dump('Invalid JSON file : ' + file.path + '\n');
    if (content) {
      dump('Content of JSON file:\n' + content + '\n');
    }
    throw e;
  }
}

/**
 * Read the file and assume it as binary, and convert it to base64 string.
 *
 * @param file {nsIFile}
 * @return {string} - the base64 encoded string, prefix with the contentType
 */
function getFileAsDataURI(file) {
  var contentType = Cc['@mozilla.org/mime;1']
                    .getService(Ci.nsIMIMEService)
                    .getTypeFromFile(file);
  var inputStream = Cc['@mozilla.org/network/file-input-stream;1']
                    .createInstance(Ci.nsIFileInputStream);
  inputStream.init(file, 0x01, parseInt('0600', 8), 0);
  var stream = Cc['@mozilla.org/binaryinputstream;1']
               .createInstance(Ci.nsIBinaryInputStream);
  stream.setInputStream(inputStream);
  var encoded = btoa(stream.readBytes(stream.available()));
  return 'data:' + contentType + ';base64,' + encoded;
}

/**
 * Read the `manifest.webapp` from an app's `application.zip` file.
 * The `appDir` file object must be `profile/webapps/someapp.gaiamobile.org`,
 * which contains the `application.zip` file.
 *
 * The read out manifest would be an object.
 *
 * @param appDir {nsIFile}
 * @return {object} - parsed from the JSON file: manifest.webapp
 */
function readZipManifest(appDir) {
  let zipFile = appDir.clone();
  zipFile.append('application.zip');

  if (!zipFile.exists()) {
    return null;
  }

  var zipReader =
    Cc['@mozilla.org/libjar/zip-reader;1'].createInstance(Ci.nsIZipReader);
  zipReader.open(zipFile);
  zipReader.test(null);
  if (zipReader.hasEntry('manifest.webapp')) {
    let zipStream = zipReader.getInputStream('manifest.webapp');

    let converterStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                             .createInstance(Ci.nsIConverterInputStream);
    converterStream.init(zipStream, 'utf-8', zipStream.available(),
        Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

    let out = {};
    let count = zipStream.available();
    converterStream.readString(count, out);

    let manifest = JSON.parse(out.value);
    converterStream.close();
    zipStream.close();

    return manifest;
  }

  throw new Error(' -*- build/utils.js: missing manifest.webapp for packaged' +
                  ' app (' + appDir.leafName + ')\n');
}

/**
 * Get an app's detail in an object. For example:
 * {
 *    manifest: the parsed JSON object of the manifest,
 *    manifestFile: the File object of the manifest,
 *    ...
 *    domain: the domain
 * }
 *
 * @param app {string} - the app name
 * @param domain {string} - the domain name, like 'gaiamobile.org'
 * @param scheme {string} - 'http://' or 'app://'
 * @param port {string} - '8080' or keep null
 * @param stageDir {string} - the path of the build stage directory
 * @return {obeject} - the information of the webapp
 */
function getWebapp(app, domain, scheme, port, stageDir) {
  let appDir = getFile(app);
  if (!appDir.exists()) {
    throw new Error(' -*- build/utils.js: file not found (' +
      app + ')\n');
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
  let manifestJSON = getJSON(manifest);

  // Use the folder name as the the domain name
  let appDomain = appDir.leafName + '.' + domain;
  if (manifestJSON.origin) {
    appDomain = utils.getNewURI(manifestJSON.origin).host;
  }

  let webapp = {
    manifest: manifestJSON,
    manifestFile: manifest,
    buildManifestFile: manifest,
    url: scheme + appDomain,
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
    webapp.pckManifest = readZipManifest(webapp.sourceDirectoryFile);
    webapp.metaData = getJSON(metaData);
    webapp.appStatus = utils.getAppStatus(webapp.metaData.type || 'web');
  } else {
    webapp.appStatus = utils.getAppStatus(webapp.manifest.type);
  }

  // Some webapps control their own build
  webapp.buildDirectoryFile = utils.getFile(stageDir,
    webapp.sourceDirectoryName);
  webapp.buildManifestFile = utils.getFile(webapp.buildDirectoryFile.path,
    'manifest.webapp');

  return webapp;
}

/**
 * Get the collection of the information of webapps.
 *
 * @param appdirs {[string]} - the list of all app names
 * @param domain {string} - the domain name, like 'gaiamobile.org'
 * @param scheme {string} - 'http://' or 'app://'
 * @param port {string} - '8080' or keep null
 * @param stageDir {string} - the path of the build stage directory
 * @return {[obeject]} - the list of information of the webapps
 */
function makeWebappsObject(appdirs, domain, scheme, port, stageDir) {
  var apps = [];
  appdirs.forEach(function(app) {
    var webapp = getWebapp(app, domain, scheme, port, stageDir);
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
  getInstance: function(config) {
    if (JSON.stringify(this.config) !== JSON.stringify(config) ||
      !this.instance) {
      this.config = config;
      this.instance = {
        stageDir: getFile(this.config.STAGE_DIR),
        engine: this.config.GAIA_ENGINE,
        sharedFolder: getFile(this.config.GAIA_DIR, 'shared'),
        webapps: makeWebappsObject(this.config.GAIA_APPDIRS.split(' '),
          this.config.GAIA_DOMAIN, this.config.GAIA_SCHEME,
          this.config.GAIA_PORT, this.config.STAGE_DIR),
        aggregatePrefix: 'gaia_build_',
        distributionDir: this.config.GAIA_DISTRIBUTION_DIR
      };
    }
    return this.instance;
  }
};

// FIXME (Bug 952901): because TBPL use path style like C:/path1/path2 for
// LOCALE_BASEDIR but we expect C:\path1\path2, so we need convert it if this
// script is running on Windows.
//
// remove it if bug 952900 fixed.
function getLocaleBasedir(original) {
  return (getOsType().indexOf('WIN') !== -1) ?
    original.replace('/', '\\', 'g') : original;
}

/**
 * To see if one app is existing in the app directories.
 * It would try to get the app to see if it's really existing.
 *
 * @param appDirs {string} - <'path to system> <path to video> ...' list of apps
 * @param appName {string} - the name of the app
 * @return {bool}
 */
function existsInAppDirs(appDirs, appName) {
  var apps = appDirs.split(' ');
  var exists = apps.some(function (appPath) {
    let appFile = getFile(appPath);
    return (appName === appFile.leafName);
  });
  return exists;
}

/**
 * Give the content of config file in distribution directory.
 * If there is no such JSON file, give the default content.
 *
 * @param name {string} - the config name
 * @param defaultContent {object} - the default content map
 * @param distDir {string} - the path of distribution direction
 */
function getDistributionFileContent(name, defaultContent, distDir) {
  if (distDir) {
    let distributionFile = getFile(distDir, name + '.json');
    if (distributionFile.exists()) {
      return getFileContent(distributionFile);
    }
  }
  return JSON.stringify(defaultContent, null, '  ');
}

/**
 * Give the relative or absolute path, then try to get the file to give
 * the indicated file object.
 *
 * This is similar to the `getFile`, but it can use relative path to invoke
 * the `getFile` implicitly.
 *
 * @param path {string}
 * @param gaiaDir {string} - the path of Gaia directory
 * @return {nsIFile}
 */
function resolve(path, gaiaDir) {
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
 * @returns {Array}   list of string which contains all files' full path.
 * Note: this function is a wrapper function  for node.js
 */
function listFiles(path, type, recursive, exclude) {
  var file = (typeof path === 'string' ? getFile(path) : path);
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
 * Check if a file or directory exists.
 * Note: this function is a wrapper function  for node.js
 *
 * @param path {string} - the path; must not come with '../' or './'
 */
function fileExists(path) {
  return getFile(path).exists();
}

/**
 * Create dir and its parents.
 * Note: this function is a wrapper function  for node.js
 *
 * @param path {string} - the path; must not come with '../' or './'
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
 * From a path to extract it's directory name.
 * For example:
 *  '/tmp/b2g/foo/bar.json' -> '/tmp/b2g/foo'
 */
function dirname(path) {
  return OS.Path.dirname(path);
}

/**
 * From a path to extract it's directory name.
 * For example:
 *  '/tmp/b2g/foo/bar.json' -> 'foo.json'
 */
function basename(path) {
  return OS.Path.basename(path);
}

/**
 * Copy path to parentPath/name.
 * The 'path' and 'toParent' must not come with '../' or './' .
 *
 * @param  {string}  path       the file to copy,
 * @param  {string}  toParent   where to put the new file,
 * @param  {string}  name       the name of the new file,
 * @param  {boolean} override   set to true to overwride it if it is existed.

 * Note: this function is a wrapper function for node.js
 */
function copyFileTo(path, toParent, name, override) {
  var file = ((typeof path === 'string') ? getFile(path) : path);
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
 * Copy path to parentPath/name.
 * The 'path' and 'toParent' must not come with '../' or './' .
 *
 * @param  {string}  path       the directory to copy,
 * @param  {string}  toParent   where to put the new directory,
 * @param  {string}  name       the name of the copied directory,
 * @param  {boolean} override   set to true to overwride it if it is existed.

 * Note: this function is a wrapper function for node.js
 */
function copyDirTo(path, toParent, name, override) {
  var dir = ((typeof path === 'string') ? getFile(path) : path);
  var parentFile = getFile(toParent);
  ensureFolderExists(parentFile);
  ensureFolderExists(dir);
  var newFolderName = joinPath(toParent, name);
  var files = ls(dir, false);
  files.forEach(function(file) {
    if (file.isFile()) {
      copyFileTo(file.path, newFolderName, file.leafName, true);
    } else if (file.isDirectory()) {
      copyDirTo(file.path, newFolderName, file.leafName, true);
    }
  });
}

/**
 * Create standard XMLHttpRequest object.
 * Note: this function is a wrapper function  for node.js
 */
function createXMLHttpRequest() {
  let XMLHttpRequest = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'];

  var ret = new XMLHttpRequest();
  ret.mozBackgroundRequest = true;
  return ret;
}

/**
 * Download JSON file from internet with XMLHttpRequest.
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
 * Read JSON object from path, if the path is folder, it returns null.
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
 * Write content to a file
 * The 'path' must not come with '../' or './' .
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
  let exitResult = exitResultFunc();
  while (thread.hasPendingEvents() || exitResult.wait) {
    thread.processNextEvent(true);
    exitResult = exitResultFunc();
  }
  if (exitResult.error) {
    throw exitResult.error;
  }
}

/**
 * To create a tempory directory.
 * It would append the directory under the default temporary directory.
 * If the directory is already there, the function would create a
 * directory with the variated name according to the 'dirName'.
 *
 * @param dirName {string}
 * @return {nsIFile}
 */
function getTempFolder(dirName) {
  var file = Cc['@mozilla.org/file/directory_service;1']
               .getService(Ci.nsIProperties).get('TmpD', Ci.nsIFile);
  file.append(dirName);
  file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
  file = file.clone();
  return file;
}

/**
 * Get one XML file's content and parse it as DOM tree.
 *
 * About the parser:
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 *
 * @param file {nsIFile} - the file object
 * @return {DOM} - the parsed DOM tree
 */
function getXML(file) {
  try {
    var parser = Cc['@mozilla.org/xmlextras/domparser;1']
             .createInstance(Ci.nsIDOMParser);
    let content = getFileContent(file);
    return parser.parseFromString(content, 'application/xml');
  } catch (e) {
    dump('Invalid XML file : ' + file.path + '\n');
    throw e;
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
  for (var i = 1; i < arguments.length; i++) {
    msg += ' ' + arguments[i];
  }
  dump(msg + '\n');
}

/**
 * To retrive all 'apps-*.list' in the build directory.
 * Will turn them into POD object. For example:
 *
 *    Gaia/build/config/phone/apps-production.list ->
 *    {'production': {
 *      'path': <absolute path of the above file>,
 *      'content': <stringified content of the file>
 *    }}
 *
 * The 'builddir' must not come with '../' or './' .
 *
 * @param builddir {string} - the path to the build directory
 * @return {object}
 */
function getBuildConfig(builddir) {
  var result = {};
  ls(getFile(builddir), false).forEach(function(file) {
    var matched = file.leafName.match(/apps-(.+)\.list$/);
    if (matched) {
      result[matched[1]] = {
        'path': file.path,
        'content': getFileContent(file)
      };
    }
  });
  return result;
}

/**
 * To get all listed apps' name, manifest and path.
 * The 'gaiadir' and 'distdir' must not come with '../' or './'
 *
 * @see getApp

 * @param content {string} - stringified list of apps' name; one line per app
 * @param gaiadir {string} - the path of Gaia
 * @param distdir {string} - the path of distribution directory
 * @return {object} - the map of all apps it found
 */
function getAppsByList(content, gaiadir, distdir) {
  var re = /(.+)\/(.+)/;
  var apps = {};
  content.split('\n').forEach(function(line) {
    line = line.trim();
    var matched = line.match(re);
    if (matched) {
      if (matched[2] === '*') {
        ls(getFile(gaiadir, matched[1])).forEach(function(file) {
          if (file.isDirectory()) {
            var app = getApp(matched[1], file.leafName, gaiadir, distdir);
            if (apps[app.name]) {
              throw new Error('two apps with same name: \n  - ' + app.path +
                      '\n  ' + apps[app.name]);
            }
            apps[app.name] = app;
          }
        });
      } else {
        var app = getApp(matched[1], matched[2], gaiadir, distdir);
        if (apps[app.name]) {
          throw new Error('two apps with same name: \n  - ' + app.path +
                      '\n  ' + apps[app.name]);
        }
        apps[app.name] = app;
      }
    } else if (line) {
      var msg = 'Unsupported path "' + line + '" in app list file.';
      log('utils', msg);
      throw new Error(msg);
    }
  });
  return apps;
}

/**
 * Get one app's information.
 * The 'parent' must be relative path under Gaia directory.
 * The 'gaiadir' and 'distdir' must not come with '../' or './'
 *
 * The information would be in object like:
 *
 *  { 'name': 'system,
 *    'manifest': <the manifest information object>,
 *    'path': <path from Gaia or distribution's absolute one to the app>
 *  }
 *
 * @param parent {string} - the path of the app's parent under Gaia directory
 * @param appname {string} - the name of the app
 * @param gaiadir {string} - the path of Gaia
 * @param distdir {string} - the path of distribution directory
 * @return {object}
 */
function getApp(parent, appname, gaiadir, distdir) {
  var app = { 'name': appname, 'parent': parent };
  var appInGaia = getFile(gaiadir, parent, appname);
  var appInDist = getFile(distdir, parent, appname);

  if (appInGaia.exists()) {
    app.path = appInGaia.path;
  } else if (appInDist.exists()) {
    app.path = appInDist.path;
  } else {
    throw new Error('app doesn\'t exist: ' + app.name);
  }

  var filename;
  if (getFile(app.path, 'manifest.webapp').exists()) {
    filename = 'manifest.webapp';
  } else if (getFile(app.path, 'update.webapp').exists()) {
    filename = 'update.webapp';
  } else {
    throw new Error('manifest or update.webapp deosn\'t exists: ' + appname);
  }
  app.manifest = getJSON(getFile(app.path, filename));

  return app;
}

/**
 * Retrive the app's name from the path of the manifest file.
 * The 'manifestPath' must not come with '../' or './' .
 *
 * @param manifestPath {string} - the path to the manifest file
 * @return {string} - the name of the app
 */
function getAppName(manifestPath) {
  var file = getFile(manifestPath);
  var content = getJSON(file);
  return content.name;
}

/**
 * To replace the ' ' to '-', and turn all characters to lower case,
 * and eliminate all non-word characters.
 *
 * @param appname {string} - the string
 * @return {string}
 */
function normalizeString(appname) {
  return appname.replace(' ', '-').toLowerCase().replace(/\W/g, '');
}

/**
 * We can use Commander to execute a shell command.
 *
 * Note: it requires to inititialize execute path before trigger run.
 * ex: adb = new Commander('adb');
 */
function Commander(cmd) {
  var command =
    (getOsType().indexOf('WIN') !== -1 && cmd.indexOf('.exe') === -1) ?
    cmd + '.exe' : cmd;
  var _file = null;

  // paths can be string or array, we'll eventually store one workable
  // path as _path.
  this.initPath = function(paths) {
    if (typeof paths === 'string') {
      var file = getFile(paths, command);
      _file = (file.exists() && file.isExecutable()) ? file : null;
    } else if (typeof paths === 'object' && paths.length) {
      for (var p in paths) {
        try {
          var result = getFile(paths[p], command);
          if (result && result.exists()) {
            _file = result;
            break;
          }
        } catch (e) {
          // Windows may throw error if we parse invalid folder name,
          // so we need to catch the error and continue seaching other
          // path.
          continue;
        }
      }
    }
    if (!_file) {
      throw new Error('it does not support ' + command + ' command');
    }
  };

  this.run = function(args, callback) {
    var process = Cc['@mozilla.org/process/util;1']
                  .createInstance(Ci.nsIProcess);
    try {
      log('cmd', command + ' ' + args.join(' '));
      process.init(_file);
      process.run(true, args, args.length);
    } catch (e) {
      throw new Error('having trouble when execute ' + command +
        ' ' + args.join(' '));
    }
    callback && callback();
  };

  /**
   * This function use subprocess module to run command. We can capture stdout
   * throught it.
   *
   * @param {Array} args Arrays of command. ex: ['adb', 'b2g-ps'].
   * @param {Object} options Callback for stdin, stdout, stderr and done.
   *
   * XXXX: Since method "runWithSubprocess" cannot be executed in Promise yet,
   *       we need to keep original method "run" for push-to-device.js (nodejs
   *       support). We'll file another bug for migration things.
   */
  this.runWithSubprocess = function(args, options) {
    log('cmd', _file.path + ' ' + args.join(' '));
    var p = subprocess.call({
      command: _file,
      arguments: args,
      stdin: (options && options.stdin) || function(){},
      stdout: (options && options.stdout) || function(){},
      stderr: (options && options.stderr) || function(){},
      done: (options && options.done) || function(){},
    });
    p.wait();
  };
}

function getEnv(name) {
  var env = Cc['@mozilla.org/process/environment;1'].
            getService(Ci.nsIEnvironment);
  return env.get(name);
}

/**
 * Get PATH of the environment
 * @return {[string]}
 */
function getEnvPath() {
  var paths;
  var os = getOsType();
  if (!os) {
    throw new Error('cannot not read system type');
  }
  var p = getEnv('PATH');
  var isMsys = getEnv('OSTYPE') ? true : false;
  if (os.indexOf('WIN') !== -1 && !isMsys) {
    paths = p.split(';');
  } else {
    paths = p.split(':');
  }
  return paths;
}

/**
 * Kill one running app by PID.
 * @param appName {string} - the app name
 * @param gaiaDir {string} - the absolute path to Gaia directory
 */
function killAppByPid(appName, gaiaDir) {

  var sh = new Commander('sh');
  sh.initPath(getEnvPath(), function() {});
  var tempFileName = 'tmpFile';
  var tmpFileSrc = joinPath(gaiaDir, tempFileName);
  sh.run(['-c', 'touch ' + tempFileName]);
  sh.run(['-c', 'adb shell b2g-ps > ' + tmpFileSrc]);
  var tempFile = getFile(tmpFileSrc);
  var content = getFileContent(tempFile);
  var pidMap = utils.psParser(content);
  sh.run(['-c', 'rm ' + tempFileName]);
  // b2g-ps only show first 15 letters of app name
  var truncatedAppName = appName.substr(0, 15);
  if (pidMap[truncatedAppName] && pidMap[truncatedAppName].PID) {
    sh.run(['-c', 'adb shell kill ' + pidMap[truncatedAppName].PID]);
  }
}

/**
 * Give the stringified HTML to parse it as DOM tree.
 * @param content {string} - the HTML content
 * @return {DOM}
 */
function getDocument(content) {
  var DOMParser = CC('@mozilla.org/xmlextras/domparser;1', 'nsIDOMParser');
  return (new DOMParser()).parseFromString(content, 'text/html');
}

/**
 * To add a new file with the data into the ZIP file. If the file exists,
 * it would be overwritten.
 *
 * The 'compression' is an enum of 'interfacensIZipWriter', which indicates
 * the level of compression:
 *
 *  COMPRESSION_NONE = 0
 *  COMPRESSION_FASTEST = 1
 *  COMPRESSION_DEFAULT = 6
 *  COMPRESSION_BEST = 9  (default one in this function)
 *
 * @see http://mdn.beonex.com/en/nsIZipWriter.html
 *
 * The 'pathInZip' can be initial with '/' or no '/'.
 *
 * @param zip {nsIZipWriter} - the zip file
 * @param pathInZip {string} - the relative path to the new file
 * @param data {string} - the content of the file
 * @param time {string} - the timestamp of the file
 * @param compression {number} - the enum shows above
 */
function addEntryContentWithTime(zip, pathInZip, data, time, compression) {
  if (!data) {
    return;
  }

  if (compression === undefined) {
    compression = Ci.nsIZipWriter.COMPRESSION_BEST;
  }

  var input;
  if (typeof data === 'string') {
    let converter = Cc['@mozilla.org/intl/scriptableunicodeconverter']
                      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = 'UTF-8';
    input = converter.convertToInputStream(data);
  } else if (typeof data === 'object' && data.isFile()) {
    input = Cc['@mozilla.org/network/file-input-stream;1'].
                createInstance(Ci.nsIFileInputStream);
    input.init(data, -1, -1, 0);
  }

  zip.addEntryStream(
    pathInZip, time || 0, compression, input, false);
  input.close();

}

/**
 * Convert the 'none' to nsIZipWriter.COMPRESSION_NONE and
 * 'best' to nsIZipWriter.COMPRESSION_BEST.
 */
function getCompression(type) {
  switch(type) {
    case 'none':
      return Ci.nsIZipWriter.COMPRESSION_NONE;
    case 'best':
      return Ci.nsIZipWriter.COMPRESSION_BEST;
  }
}

/**
 * Generate UUID. It's just a wrapper of 'nsIUUIDGenerator'
 * See the 'nsIUUIDGenerator' page on MDN.
 */
function generateUUID() {
  var uuidGenerator = Cc['@mozilla.org/uuid-generator;1']
                      .createInstance(Ci.nsIUUIDGenerator);
  return uuidGenerator.generateUUID();
}

/**
 * Copy directory recursively.
 *
 * @param source {nsIFile} - the source directory
 * @param target {nsIFile} - the target directlry
 */
function copyRec(source, target) {
  var files = source.directoryEntries;
  if (!target.exists()) {
    target.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
  }

  while (files.hasMoreElements()) {
    var file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      var subFolder = target.clone();
      subFolder.append(file.leafName);
      copyRec(file, subFolder);
    } else {
      file.copyTo(target, file.leafName);
    }
  }
}

/**
 * Create an empty ZIP file.
 * For users, the way to read/write a ZIP file is
 *
 * 1. create an nsIZipWriter
 * 2. open it with the open method, which
 * 3. puts an nsIFile as the first argument
 *
 * For example:
 *
 *  createZip().open(getFile(<some file>, <mode>))
 *
 * @return {nsIZipWriter}
 */
function createZip() {
  var zip = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
  return zip;
}

/**
 * Remove all listed files in the directory.
 *
 * @param dir {nsIFile} - the directory
 * @param filenames {[string]} - the file names
 */
function removeFiles(dir, filenames) {
  filenames.forEach(function(fn) {
    var file = getFile(dir.path, fn);
    if (file.exists()) {
      file.remove(file.isDirectory());
    }
  });
}

/**
 * To cache loaded scripts with a wrapped loader.
 * The 'exportObj' is the context of the script, which is to prevent
 * the script overwrite the things in the global context.
 */
var scriptLoader = {
  scripts: {},
  load: function(path, exportObj) {
    try {
      if (this.scripts[path]) {
        return;
      }
      Services.scriptloader.loadSubScript(path, exportObj);
      this.scripts[path] = true;
    } catch(e) {
      delete this.scripts[path];
      throw 'cannot load script from ' + path;
    }
  }
};

exports.Q = Promise;
exports.ls = ls;
exports.getFileContent = getFileContent;
exports.writeContent = writeContent;
exports.getFile = getFile;
exports.ensureFolderExists = ensureFolderExists;
exports.getJSON = getJSON;
exports.getFileAsDataURI = getFileAsDataURI;
exports.makeWebappsObject = makeWebappsObject;
exports.getDistributionFileContent = getDistributionFileContent;
exports.resolve = resolve;
exports.getBuildConfig = getBuildConfig;
exports.getAppsByList = getAppsByList;
exports.getApp = getApp;
exports.getAppName = getAppName;
exports.getXML = getXML;
exports.getTempFolder = getTempFolder;
exports.normalizeString = normalizeString;
exports.Commander = Commander;
exports.getEnvPath = getEnvPath;
exports.getLocaleBasedir = getLocaleBasedir;
exports.getNewURI = getNewURI;
exports.getOsType = getOsType;
exports.generateUUID = generateUUID;
exports.copyRec = copyRec;
exports.createZip = createZip;
exports.scriptLoader = scriptLoader;
exports.scriptParser = Reflect.parse;
// ===== the following functions support node.js compitable interface.
exports.deleteFile = deleteFile;
exports.listFiles = listFiles;
exports.fileExists = fileExists;
exports.mkdirs = mkdirs;
exports.joinPath = joinPath;
exports.copyFileTo = copyFileTo;
exports.copyDirTo = copyDirTo;
exports.createXMLHttpRequest = createXMLHttpRequest;
exports.downloadJSON = downloadJSON;
exports.readJSONFromPath = readJSONFromPath;
exports.writeContentToFile = writeContentToFile;
exports.processEvents = processEvents;
exports.readZipManifest = readZipManifest;
exports.log = log;
exports.killAppByPid = killAppByPid;
exports.getEnv = getEnv;
exports.isExternalApp = isExternalApp;
exports.getDocument = getDocument;
exports.getWebapp = getWebapp;
exports.Services = Services;
exports.gaia = gaia;
exports.concatenatedScripts = concatenatedScripts;
exports.dirname = dirname;
exports.basename = basename;
exports.addEntryContentWithTime = addEntryContentWithTime;
exports.getCompression = getCompression;
exports.existsInAppDirs = existsInAppDirs;
exports.removeFiles = removeFiles;
