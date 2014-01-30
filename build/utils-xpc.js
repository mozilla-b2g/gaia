const { Cc, Ci, Cr, Cu } = require('chrome');
const { btoa } = Cu.import('resource://gre/modules/Services.jsm', {});
const multilocale = require('./multilocale');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');

var utils = require('./utils.js');
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

function getOsType() {
  return Cc['@mozilla.org/xre/app-info;1']
          .getService(Ci.nsIXULRuntime).OS;
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
        dir.split(/[\\\/]/).forEach(function(name) {
          if (name === '..') {
            file = file.parent;
          } else {
            file.append(name);
          }
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

function getFileAsDataURI(file) {
  var contentType = Cc['@mozilla.org/mime;1']
                    .getService(Ci.nsIMIMEService)
                    .getTypeFromFile(file);
  var inputStream = Cc['@mozilla.org/network/file-input-stream;1']
                    .createInstance(Ci.nsIFileInputStream);
  inputStream.init(file, 0x01, 0600, 0);
  var stream = Cc['@mozilla.org/binaryinputstream;1']
               .createInstance(Ci.nsIBinaryInputStream);
  stream.setInputStream(inputStream);
  var encoded = btoa(stream.readBytes(stream.available()));
  return 'data:' + contentType + ';base64,' + encoded;
}

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

function makeWebappsObject(appdirs, domain, scheme, port) {
  return {
    forEach: function(fun) {
      appdirs.forEach(function(app) {
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
          webapp.pckManifest = readZipManifest(webapp.sourceDirectoryFile);
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
              if (segment == '..')
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
  var gaia = {
    engine: options.GAIA_ENGINE,
    sharedFolder: getFile(options.GAIA_DIR, 'shared'),
    webapps: makeWebappsObject(options.GAIA_APPDIRS.split(' '),
      options.GAIA_DOMAIN, options.GAIA_SCHEME, options.GAIA_PORT),
    aggregatePrefix: 'gaia_build_',
    distributionDir: options.GAIA_DISTRIBUTION_DIR
  };

  if (options.LOCALE_BASEDIR) {
    // Bug 952901: remove getLocaleBasedir() if bug 952900 fixed.
    var localeBasedir = getLocaleBasedir(options.LOCALE_BASEDIR);
    gaia.l10nManager = new multilocale.L10nManager(
      options.GAIA_DIR,
      gaia.sharedFolder.path,
      options.LOCALES_FILE,
      localeBasedir);
  }

  return gaia;
}

// FIXME (Bug 952901): because TBPL use path style like C:/path1/path2 for
// LOCALE_BASEDIR but we expect C:\path1\path2, so we need convert it if this
// script is running on Windows.
//
// remove it if bug 952900 fixed.
function getLocaleBasedir(original) {
  return (getOsType().indexOf('WIN') !== -1) ?
    original.replace('/', '\\', 'g') : original;
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
  } while (thread.hasPendingEvents() || exitResult.wait);
  if (exitResult.error) {
    throw exitResult.error;
  }
}

function getTempFolder(dirName) {
  var file = Cc['@mozilla.org/file/directory_service;1']
               .getService(Ci.nsIProperties).get('TmpD', Ci.nsIFile);
  file.append(dirName);
  file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
  file = file.clone();
  return file;
}

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

function getAppName(manifestPath) {
  var file = getFile(manifestPath);
  var content = getJSON(file);
  return content.name;
}

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
  var _path;
  var _file = null;

  // paths can be string or array, we'll eventually store one workable
  // path as _path.
  this.initPath = function(paths) {
    if (typeof paths === 'string') {
      _path = paths;
    } else if (typeof paths === 'object' && paths.length) {
      for (var p in paths) {
        try {
          var result = getFile(paths[p], command);
          if (result && result.exists()) {
            _path = paths[p];
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
      process.init(_file);
      process.run(true, args, args.length);
      log(command + ' ' + args.join(' '));
    } catch (e) {
      throw new Error('having trouble when execute ' + command +
        ' ' + args.join(' '));
    }
    callback && callback();
  };
};

// Get PATH of the environment
function getEnvPath() {
  var os = getOsType();
  if (!os) {
    throw new Error('cannot not read system type');
  }
  var env = Cc['@mozilla.org/process/environment;1'].
            getService(Ci.nsIEnvironment);
  var p = env.get('PATH');
  var isMsys = env.get('OSTYPE') ? true : false;
  if (os.indexOf('WIN') !== -1 && !isMsys) {
    paths = p.split(';');
  } else {
    paths = p.split(':');
  }
  return paths;
}

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
  if (pidMap[appName] && pidMap[appName].PID) {
    sh.run(['-c', 'adb shell kill ' + pidMap[appName].PID]);
  }
}

exports.Q = Promise;
exports.ls = ls;
exports.getFileContent = getFileContent;
exports.writeContent = writeContent;
exports.getFile = getFile;
exports.ensureFolderExists = ensureFolderExists;
exports.getJSON = getJSON;
exports.getFileAsDataURI = getFileAsDataURI;
exports.makeWebappsObject = makeWebappsObject;
exports.gaiaOriginURL = gaiaOriginURL;
exports.gaiaManifestURL = gaiaManifestURL;
exports.getDistributionFileContent = getDistributionFileContent;
exports.resolve = resolve;
exports.getGaia = getGaia;
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
// ===== the following functions support node.js compitable interface.
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
exports.readZipManifest = readZipManifest;
exports.log = log;
exports.killAppByPid = killAppByPid;
