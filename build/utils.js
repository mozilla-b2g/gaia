const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

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
  registerProfileDirectory(options.PROFILE_DIR);
  return {
    engine: options.GAIA_ENGINE,
    sharedFolder: getFile(options.GAIA_DIR, 'shared'),
    webapps: makeWebappsObject(options.GAIA_APPDIRS.split(' '),
      options.GAIA_DOMAIN, options.GAIA_SCHEME, options.GAIA_PORT),
    aggregatePrefix: 'gaia_build_',
    distributionDir: options.GAIA_DISTRIBUTION_DIR
  }
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
    } catch(e) {}
  }
  return file;
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
exports.getAbsoluteOrRelativePath = getAbsoluteOrRelativePath
exports.getGaia = getGaia;
