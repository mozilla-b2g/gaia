const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, 'utils': Cu,
        'Constructor': CC } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

function isSubjectToBranding(path) {
  return /shared[\/\\][a-zA-Z]+[\/\\]branding$/.test(path) ||
         /branding[\/\\]initlogo.png/.test(path);
}

/**
 * Return a File object representing the directory of a given name/path.
 *
 * @param {String} dirName The name of the directory in GAIA_DIR or a full path
 * @param {Boolean} maybeGaiaSubDir
 *        If true, try to locate the dir within GAIA_DIR.
 * @return {File} dir the File object.
 */
function getDir(dirName, maybeGaiaSubDir) {

  let dir;

  // Assume directory is a absolute path first:
  try {
    dir = new FileUtils.File(dirName);
  } catch (e) {
    //dump('-*- utils.js cannot find ' + dirName + '\n');
  }

  if (!maybeGaiaSubDir)
    return dir;

  if (!dir || !dir.exists()) {
    // Assume directory is a subdirectory of GAIA_DIR
    dir = new FileUtils.File(GAIA_DIR);
    dirName.split('/').forEach(function(name) {
      dir.append(name);
    });
  }

  return dir;
}

/**
 * Return an array of sub dir object with given dir object
 *
 * @param {File} dir The directory to search for sub directories.
 * @return {Array} The list of all sub directories.
 */
function getSubDirs(dir) {
  let subDirs = [];
  let files = dir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      subDirs.push(file);
    }
  }

  return subDirs;
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

function makeWebappsObject(dirs) {
  return {
    forEach: function(fun) {
      let appSrcDirNames = dirs.split(' ');
      appSrcDirNames.forEach(function parseDirectory(directoryName) {

        // Convert the dirName to a File object
        let appSrcDir = getDir(directoryName, true);

        let appDirs = getSubDirs(appSrcDir);
        appDirs.forEach(function readManifests(appDir) {
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
          let domain = appDir.leafName + '.' + GAIA_DOMAIN;

          let webapp = {
            manifest: getJSON(manifest),
            manifestFile: manifest,
            url: GAIA_SCHEME + domain + (GAIA_PORT ? GAIA_PORT : ''),
            domain: domain,
            sourceDirectoryFile: manifestFile.parent,
            sourceDirectoryName: appDir.leafName,
            sourceAppDirectoryName: directoryName
          };

          // External webapps have a `metadata.json` file
          let metaData = webapp.sourceDirectoryFile.clone();
          metaData.append('metadata.json');
          if (metaData.exists()) {
            webapp.metaData = getJSON(metaData);
          }

          fun(webapp);
        });
      });
    }
  };
}

let additionalSrcDirNames = ['external-apps'];

if (DOGFOOD === '0' && PRODUCTION === '0') {
  additionalSrcDirNames.push('test_external_apps');
}

if (GAIA_DISTRIBUTION_DIR) {
  let externalAppsDir = new FileUtils.File(GAIA_DISTRIBUTION_DIR);
  externalAppsDir.append('external-apps');
  if (externalAppsDir.exists()) {
      additionalSrcDirNames.push(externalAppsDir.path);
  }
}

const Gaia = {
  engine: GAIA_ENGINE,
  sharedFolder: getFile(GAIA_DIR, 'shared'),
  webapps: makeWebappsObject(GAIA_APP_SRCDIRS + ' ' +
                             additionalSrcDirNames.join(' ')),
  aggregatePrefix: 'gaia_build_',
  distributionDir: GAIA_DISTRIBUTION_DIR
};

function registerProfileDirectory() {
  let directoryProvider = {
    getFile: function provider_getFile(prop, persistent) {
      persistent.value = true;
      if (prop != 'ProfD' && prop != 'ProfLDS') {
        throw Cr.NS_ERROR_FAILURE;
      }

      return new FileUtils.File(PROFILE_DIR);
    },

    QueryInterface: XPCOMUtils.generateQI([Ci.nsIDirectoryServiceProvider,
                                           Ci.nsISupports])
  };

  Cc['@mozilla.org/file/directory_service;1']
    .getService(Ci.nsIProperties)
    .QueryInterface(Ci.nsIDirectoryService)
    .registerProvider(directoryProvider);
}

if (Gaia.engine === 'xpcshell') {
  registerProfileDirectory();
}

function gaiaOriginURL(name) {
  return GAIA_SCHEME + name + '.' + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : '');
}

function gaiaManifestURL(name) {
  return gaiaOriginURL(name) + '/manifest.webapp';
}

