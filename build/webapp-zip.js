
function debug(msg) {
  //dump('-*- webapps-zip.js ' + msg + '\n');
}

// Header values usefull for zip xpcom component
const PR_RDONLY = 0x01;
const PR_WRONLY = 0x02;
const PR_RDWR = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND = 0x10;
const PR_TRUNCATE = 0x20;
const PR_SYNC = 0x40;
const PR_EXCL = 0x80;

// Make all timestamps the same so we always generate the same
// output zip file for the same inputs
const DEFAULT_TIME = 0;

/**
 * Add a file to a zip file with the specified time
 */
function addEntryFileWithTime(zip, pathInZip, file, time) {
  let fis = Cc['@mozilla.org/network/file-input-stream;1'].
              createInstance(Ci.nsIFileInputStream);
  fis.init(file, -1, -1, 0);

  zip.addEntryStream(
    pathInZip, time, Ci.nsIZipWriter.COMPRESSION_DEFAULT, fis, false);
  fis.close();
}

/**
 * Add a file or a directory, recursively, to a zip file
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       pathInZip relative path to use in zip.
 * @param {nsIFile}      file      file xpcom to add.
 */
function addToZip(zip, pathInZip, file) {
  let suffix = '@' + GAIA_DEV_PIXELS_PER_PX + 'x';
  if (file.isHidden())
    return;

  // If GAIA_DEV_PIXELS_PER_PX is not 1 and the file is a bitmap let's check
  // if there is a bigger version in the directory. If so let's ignore the
  // file in order to use the bigger version later.
  let isBitmap = /\.(png|gif|jpg)$/.test(file.path);
  if (isBitmap) {
    let matchResult = /@([0-9]+\.?[0-9]*)x/.exec(file.path);
    if ((GAIA_DEV_PIXELS_PER_PX === '1' && matchResult) ||
        (matchResult && matchResult[1] !== GAIA_DEV_PIXELS_PER_PX)) {
      return;
    }

    if (GAIA_DEV_PIXELS_PER_PX !== '1') {
      if (matchResult && matchResult[1] === GAIA_DEV_PIXELS_PER_PX) {
        // Save the hidpi file to the zip, strip the name to be more generic.
        pathInZip = pathInZip.replace(suffix, '');
      } else {
        // Check if there a hidpi file. If yes, let's ignore this bitmap since
        // it will be loaded later (or it has already been loaded, depending on
        // how the OS organize files.
        let hqfile = new FileUtils.File(
            file.path.replace(/(\.[a-z]+$)/, suffix + '$1'));
        if (hqfile.exists()) {
          return;
        }
      }
    }
  }

  if (isSubjectToBranding(file.path)) {
    file.append((OFFICIAL == 1) ? 'official' : 'unofficial');
  }

  if (!file.exists())
    throw new Error('Can\'t add inexistent file to zip : ' + file.path);

  // nsIZipWriter should not receive any path starting with `/`,
  // it would put files in a folder with empty name...
  pathInZip = pathInZip.replace(/^\/+/, '');

  // Case 1/ Regular file
  if (file.isFile()) {
    try {
      debug(' +file to zip ' + pathInZip);

      if (/\.html$/.test(file.leafName)) {
        // this file might have been pre-translated for the default locale
        let l10nFile = file.parent.clone();
        l10nFile.append(file.leafName + '.' + GAIA_DEFAULT_LOCALE);
        if (l10nFile.exists()) {
          addEntryFileWithTime(zip, pathInZip, l10nFile, DEFAULT_TIME);
          return;
        }
      }

      let re = new RegExp('\\.html\\.' + GAIA_DEFAULT_LOCALE);
      if (!zip.hasEntry(pathInZip) && !re.test(file.leafName)) {
        addEntryFileWithTime(zip, pathInZip, file, DEFAULT_TIME);
      }
    } catch (e) {
      throw new Error('Unable to add following file in zip: ' +
                      file.path + '\n' + e);
    }
  }
  // Case 2/ Directory
  else if (file.isDirectory()) {
    debug(' +directory to zip ' + pathInZip);

    if (!zip.hasEntry(pathInZip))
      zip.addEntryDirectory(pathInZip, DEFAULT_TIME, false);

    // Append a `/` at end of relative path if it isn't already here
    if (pathInZip.substr(-1) !== '/')
      pathInZip += '/';

    let files = ls(file);
    files.forEach(function(subFile) {
        let subPath = pathInZip + subFile.leafName;
        addToZip(zip, subPath, subFile);
      });
  }
}

/**
 * Copy a "Building Block" (i.e. shared style resource)
 *
 * @param {nsIZipWriter} zip        zip xpcom instance.
 * @param {Object}       file       Object which contains all info related
                                    with the file to be imported.
 */
function copyBuildingBlock(zip, file) {
  let dirPath = '/shared/style/';
  // Compute the nsIFile for this shared style.
  // First of all we access to /style level
  let styleFolder = Gaia.sharedFolder.clone();
  styleFolder.append('style');
  if (!styleFolder.exists()) {
    debug('Using inexistent shared style: ' + file.name + '\n');
    throw new Error('Using inexistent shared style: ' + file.name);
  }
  // We need to go deeper taking into account the version
  let versionFolder = styleFolder.clone();
  versionFolder.append(file.version);
  if (!versionFolder.exists()) {
    debug('Using inexistent version style: ' + file.version + '\n');
    throw new Error('Using inexistent version style: ' + file.version);
  }
  // Now we need the cssFile!
  let cssFile, subFolder, zipURL;
  if (file.type) {
    // We need to go deeper taking into account the type
    // For example 'unstable', 'test'...
    let specificFolder = versionFolder.clone();
    specificFolder.append(file.type);

    cssFile = specificFolder.clone();
    cssFile.append(file.name + '.css');

    subFolder = specificFolder.clone();
    subFolder.append(file.name);

    zipURL =
      dirPath + file.version + '/' + file.type + '/' + file.name + '.css';
  } else {
    cssFile = versionFolder.clone();
    cssFile.append(file.name + '.css');

    subFolder = versionFolder.clone();
    versionFolder.append(file.name);

    zipURL = dirPath + file.version + '/' + file.name + '.css';
  }
  // Adding the css style
  addToZip(zip, zipURL, cssFile);

  // Copy everything but index.html and any other HTML page into the
  // style/$version/$type(optional)/<block> folder.
  ls(subFolder, true).forEach(function(file) {
      let relativePath = file.getRelativeDescriptor(styleFolder);
      // Ignore HTML files at style root folder
      if (relativePath.match(/^[^\/]+\.html$/))
        return;
      // Do not process directory as `addToZip` will add files recursively
      if (file.isDirectory())
        return;
      addToZip(zip, dirPath + relativePath, file);
    });
}

function customizeFiles(zip, src, dest) {
  // Add customize file to the zip
  let files = ls(getFile(Gaia.distributionDir, src));
  files.forEach(function(file) {
    let filename = dest + file.leafName;
    if (zip.hasEntry(filename)) {
      zip.removeEntry(filename, false);
    }
    addEntryFileWithTime(zip, filename, file, DEFAULT_TIME);
  });
}

let webappsTargetDir = Cc['@mozilla.org/file/local;1']
                         .createInstance(Ci.nsILocalFile);
webappsTargetDir.initWithPath(PROFILE_DIR);

// Create profile folder if doesn't exists
ensureFolderExists(webappsTargetDir);

// Create webapps folder if doesn't exists
webappsTargetDir.append('webapps');
ensureFolderExists(webappsTargetDir);

Gaia.webapps.forEach(function(webapp) {
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;
  debug('APP NAME:' + webapp.sourceDirectoryName + '\n');
  // Compute webapp folder name in profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webapp.domain);
  ensureFolderExists(webappTargetDir);

  let zip = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);

  let mode = PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE;

  let zipFile = webappTargetDir.clone();
  zipFile.append('application.zip');
  zip.open(zipFile, mode);

  // Add webapp folder to the zip
  debug('# Create zip for: ' + webapp.domain);
  let files = ls(webapp.buildDirectoryFile);
  files.forEach(function(file) {
      // Ignore l10n files if they have been inlined or concatenated
      if ((GAIA_INLINE_LOCALES === '1' || GAIA_CONCAT_LOCALES === '1') &&
          (file.leafName === 'locales' || file.leafName === 'locales.ini'))
        return;

      // Ignore concatenated l10n files if GAIA_CONCAT_LOCALES is not set
      if (file.leafName === 'locales-obj' && GAIA_CONCAT_LOCALES !== '1')
        return;

      // Ignore files from /shared directory (these files were created by
      // Makefile code). Also ignore files in the /test directory.
      if (file.leafName !== 'shared' && file.leafName !== 'test')
        addToZip(zip, '/' + file.leafName, file);
    });

  if (webapp.sourceDirectoryName === 'system' && Gaia.distributionDir) {
    if (getFile(Gaia.distributionDir, 'power').exists()) {
      customizeFiles(zip, 'power', 'resources/power/');
    }
  }

  if (webapp.sourceDirectoryName === 'wallpaper' && Gaia.distributionDir &&
    getFile(Gaia.distributionDir, 'wallpapers').exists()) {
    customizeFiles(zip, 'wallpapers', 'resources/320x480/');
  }

  // Put shared files, but copy only files actually used by the webapp.
  // We search for shared file usage by parsing webapp source code.
  let EXTENSIONS_WHITELIST = ['html'];
  let SHARED_USAGE =
      /<(?:script|link).+=['"]\.?\.?\/?shared\/([^\/]+)\/([^''\s]+)("|')/g;

  let used = {
    js: [],              // List of JS file paths to copy
    locales: [],         // List of locale names to copy
    resources: [],       // List of resources to copy
    styles: []           // List of stable style names to copy
  };

  function sortResource(kind, path) {
    switch (kind) {
      case 'js':
        if (used.js.indexOf(path) == -1)
          used.js.push(path);
        break;
      case 'locales':
        if (GAIA_INLINE_LOCALES !== '1') {
          let localeName = path.substr(0, path.lastIndexOf('.'));
          if (used.locales.indexOf(localeName) == -1) {
            used.locales.push(localeName);
          }
        }
        break;
      case 'resources':
        if (used.resources.indexOf(path) == -1) {
          used.resources.push(path);
        }
        break;
      case 'style':
        /*
          The structure of folder is:
          /shared/style/$version/$type(optional)/$name/
          Where:
          - $version: Folder for a specific version of BB
          - $type: (Optional) For a specific set of styles grouped
          by a shared criteria (for example 'unstable', 'experimental'...)
          - $name: Name of the BB to import
        */
        let segments = path.split('/');
        let version = segments[0], type, name;
        if (segments.length > 2) {
          type = segments[1];
          name = segments[2].substr(0, segments[2].lastIndexOf('.'));
        } else {
          name = segments[1].substr(0, segments[1].lastIndexOf('.'));
        }
        function isFileAppended(name) {
          let filesAppended = used.styles.map(function(file) {
            return file.name;
          });
          return filesAppended.indexOf(name) === -1 ? false : true;
        }

        if (!isFileAppended(name)) {
          used.styles.push({
            version: version,
            type: type,
            name: name
          });
        }
        break;
    }
  }

  // Scan the files
  let files = ls(webapp.buildDirectoryFile, true);
  files.filter(function(file) {
      // Process only files that may require a shared file
      let extension = file.leafName
                          .substr(file.leafName.lastIndexOf('.') + 1)
                          .toLowerCase();
      return file.isFile() && EXTENSIONS_WHITELIST.indexOf(extension) != -1;
    }).
    forEach(function(file) {
      // Grep files to find shared/* usages
      let content = getFileContent(file);
      while ((matches = SHARED_USAGE.exec(content)) !== null) {
        let kind = matches[1]; // js | locales | resources | style
        let path = matches[2];
        sortResource(kind, path);
      }
    });

  // Look for gaia_shared.json in case app uses resources not specified in HTML
  let sharedDataFile = webapp.buildDirectoryFile.clone();
  sharedDataFile.append('gaia_shared.json');
  if (sharedDataFile.exists()) {
    let sharedData = JSON.parse(getFileContent(sharedDataFile));
    Object.keys(sharedData).forEach(function(kind) {
      sharedData[kind].forEach(function(path) {
        sortResource(kind, path);
      });
    });
  }

  used.js.forEach(function(path) {
    // Compute the nsIFile for this shared JS file
    let file = Gaia.sharedFolder.clone();
    file.append('js');
    path.split('/').forEach(function(segment) {
      file.append(segment);
    });
    if (!file.exists()) {
      throw new Error('Using inexistent shared JS file: ' + path + ' from: ' +
                      webapp.domain);
    }
    addToZip(zip, '/shared/js/' + path, file);
  });

  used.locales.forEach(function(name) {
    // Compute the nsIFile for this shared locale
    let localeFolder = Gaia.sharedFolder.clone();
    localeFolder.append('locales');
    let ini = localeFolder.clone();
    localeFolder.append(name);
    if (!localeFolder.exists()) {
      throw new Error('Using inexistent shared locale: ' + name + ' from: ' +
                      webapp.domain);
    }
    ini.append(name + '.ini');
    if (!ini.exists())
      throw new Error(name + ' locale doesn`t have `.ini` file.');

    // Add the .ini file
    addToZip(zip, '/shared/locales/' + name + '.ini', ini);
    // And the locale folder itself
    addToZip(zip, '/shared/locales/' + name, localeFolder);
  });

  used.resources.forEach(function(path) {
    // Compute the nsIFile for this shared resource file
    let file = Gaia.sharedFolder.clone();
    file.append('resources');
    path.split('/').forEach(function(segment) {
      file.append(segment);
      if (isSubjectToBranding(file.path)) {
        file.append((OFFICIAL == 1) ? 'official' : 'unofficial');
      }
    });
    if (!file.exists()) {
      throw new Error('Using inexistent shared resource: ' + path +
                      ' from: ' + webapp.domain + '\n');
      return;
    }

    // Add not only file itself but all its hidpi-suffixed versions.
    let fileNameRegexp = new RegExp(
        '^' + file.leafName.replace(/(\.[a-z]+$)/, '(@.*x)?\\$1') + '$');
    ls(file.parent, false).forEach(function(listFile) {
      if (fileNameRegexp.test(listFile.leafName)) {
        addToZip(zip, '/shared/resources/' + path, listFile);
      }
    });

    if (path === 'media/ringtones/' && Gaia.distributionDir &&
      getFile(Gaia.distributionDir, 'ringtones').exists()) {
      customizeFiles(zip, 'ringtones', 'shared/resources/media/ringtones/');
    }
  });

  used.styles.forEach(function(file) {
    try {
      copyBuildingBlock(zip, file);
    } catch (e) {
      throw new Error(e + ' from: ' + webapp.domain);
    }
  });

  zip.close();
});
