const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, 'utils': Cu,
        'Constructor': CC } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

function getSubDirectories(directory) {
  let appsDir = new FileUtils.File(GAIA_DIR);
  appsDir.append(directory);

  let dirs = [];
  let files = appsDir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      dirs.push(file.leafName);
    }
  }
  return dirs;
}

function getFileContent(file) {
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

  let content = out.value;
  converterStream.close();
  fileStream.close();

  return content;
}

function writeContent(file, content) {
  let stream = FileUtils.openFileOutputStream(file);
  stream.write(content, content.length);
  stream.close();
}

// Return an nsIFile by joining paths given as arguments
// First path has to be an absolute one
function getFile() {
  let file = new FileUtils.File(arguments[0]);
  if (arguments.length > 1) {
    for (let i = 1; i < arguments.length; i++) {
      file.append(arguments[i]);
    }
  }
  return file;
}

function ensureFolderExists(file) {
  if (!file.exists()) {
    try {
      file.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
    } catch(e if e.result == Cr.NS_ERROR_FILE_ALREADY_EXISTS) {
      // Bug 808513: Ignore races between `if exists() then create()`.
      return;
    }
  }
}

function getJSON(file) {
  let content = getFileContent(file);
  return JSON.parse(content);
}

function makeWebappsObject(dirs) {
  return {
    forEach: function (fun) {
      let appSrcDirs = dirs.split(' ');
      appSrcDirs.forEach(function parseDirectory(directoryName) {
        let directories = getSubDirectories(directoryName);
        directories.forEach(function readManifests(dir) {
          let manifestFile = getFile(GAIA_DIR, directoryName, dir, "manifest.webapp");
          // Ignore directories without manifest
          if (!manifestFile.exists())
            return;
          let domain = dir + "." + GAIA_DOMAIN;

          let webapp = {
            manifest: getJSON(manifestFile),
            manifestFile: manifestFile,
            url: GAIA_SCHEME + domain + (GAIA_PORT ? GAIA_PORT : ''),
            domain: domain,
            sourceDirectoryFile: manifestFile.parent,
            sourceDirectoryName: dir,
            sourceAppDirectoryName: directoryName
          };

          // External webapps have an `origin` file
          let origin = webapp.sourceDirectoryFile.clone();
          origin.append('origin');
          if (origin.exists()) {
            let url = getFileContent(origin);
            // Strip any leading/ending spaces
            webapp.origin = url.replace(/^\s+|\s+$/, '');
          }

          fun(webapp);
        });
      });
    }
  };
}

const Gaia = {
  engine: GAIA_ENGINE,
  sharedFolder: getFile(GAIA_DIR, 'shared'),
  webapps: makeWebappsObject(GAIA_APP_SRCDIRS),
  externalWebapps: makeWebappsObject('external-apps')
};

function registerProfileDirectory() {
  let directoryProvider = {
    getFile: function provider_getFile(prop, persistent) {
      persistent.value = true;
      if (prop != "ProfD" && prop != "ProfLDS") {
        throw Cr.NS_ERROR_FAILURE;
      }

      return new FileUtils.File(PROFILE_DIR);
    },

    QueryInterface: XPCOMUtils.generateQI([Ci.nsIDirectoryServiceProvider, Ci.nsISupports])
  };

  Cc["@mozilla.org/file/directory_service;1"]
    .getService(Ci.nsIProperties)
    .QueryInterface(Ci.nsIDirectoryService)
    .registerProvider(directoryProvider);
}

if (Gaia.engine === "xpcshell") {
  registerProfileDirectory();
}


function gaiaOriginURL(name) {
  return GAIA_SCHEME + name + '.' + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : '');
}

function gaiaManifestURL(name) {
  return gaiaOriginURL(name) + "/manifest.webapp";
}
