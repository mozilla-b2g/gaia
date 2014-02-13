/*global require, FileUtils, exports*/

var utils = require('./utils');
var config;
const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/FileUtils.jsm');

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

const MANIFEST_FILENAME = 'manifest.webapp';

/**
 * Add a file to a zip file with the specified time
 */
function addEntryFileWithTime(zip, pathInZip, file, time, compression) {
  if (compression === undefined) {
    compression = Ci.nsIZipWriter.COMPRESSION_BEST;
  }
  let fis = Cc['@mozilla.org/network/file-input-stream;1'].
              createInstance(Ci.nsIFileInputStream);
  fis.init(file, -1, -1, 0);

  zip.addEntryStream(
    pathInZip, time, compression, fis, false);
  fis.close();
}

/**
 * Add a string to a zip file with the specified time
 */
function addEntryStringWithTime(zip, pathInZip, data, time, compression) {
  if (compression === undefined) {
    compression = Ci.nsIZipWriter.COMPRESSION_BEST;
  }
  let converter = Cc['@mozilla.org/intl/scriptableunicodeconverter']
                    .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = 'UTF-8';
  let sis = converter.convertToInputStream(data);

  zip.addEntryStream(
    pathInZip, time, compression, sis, false);
  sis.close();
}

function getCompression(pathInZip, webapp) {
  if (webapp.metaData && webapp.metaData.external === false &&
    webapp.metaData.zip && webapp.metaData.zip.mmap_files &&
    webapp.metaData.zip.mmap_files.indexOf(pathInZip) !== -1) {
    return Ci.nsIZipWriter.COMPRESSION_NONE;
  } else {
    // Don't store some files compressed since that's not giving us any
    // benefit but costs cpu when reading from the zip.
    var ext = pathInZip.split('.').reverse()[0].toLowerCase();
    return (['gif', 'jpg', 'jpeg', 'png',
             'ogg', 'opus'].indexOf(ext) !== -1) ?
            Ci.nsIZipWriter.COMPRESSION_NONE :
            Ci.nsIZipWriter.COMPRESSION_BEST;
  }
}

function exclude(path, options, appPath) {
  var firstDir = path.substr(appPath.length+1).split(/[\\/]/)[0];
  var isShared = firstDir === 'shared';
  var isTest = firstDir === 'test';
  var file = utils.getFile(path);

  // Ignore l10n files if they have been inlined or concatenated
  if ( options.GAIA_CONCAT_LOCALES === '1' &&
      (file.leafName === 'locales' || file.leafName === 'locales.ini' ||
      file.parent.leafName === 'locales')) {
    return true;
  }

  // Ignore concatenated l10n files if options.GAIA_CONCAT_LOCALES
  // is not set
  if ((file.leafName === 'locales-obj' ||
      file.parent.leafName === 'locales-obj') &&
      options.GAIA_CONCAT_LOCALES !== '1') {
    return true;
  }

  // Ignore files from /shared directory (these files were created by
  // Makefile code). Also ignore files in the /test directory.
  if (isShared || isTest) {
    return true;
  }

  return false;
}

/**
 * Add a file or a directory, recursively, to a zip file
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       pathInZip relative path to use in zip.
 * @param {nsIFile}      file      file xpcom to add.
 */
function addToZip(zip, pathInZip, file, compression) {
  let suffix = '@' + config.GAIA_DEV_PIXELS_PER_PX + 'x';
  if (file.isHidden()) {
    return;
  }
  // If config.GAIA_DEV_PIXELS_PER_PX is not 1 and the file is a bitmap let's
  // check if there is a bigger version in the directory. If so let's ignore the
  // file in order to use the bigger version later.
  let isBitmap = /\.(png|gif|jpg)$/.test(file.path);
  if (isBitmap) {
    let matchResult = /@([0-9]+\.?[0-9]*)x/.exec(file.path);
    if ((config.GAIA_DEV_PIXELS_PER_PX === '1' && matchResult) ||
        (matchResult && matchResult[1] !== config.GAIA_DEV_PIXELS_PER_PX)) {
      return;
    }

    if (config.GAIA_DEV_PIXELS_PER_PX !== '1') {
      if (matchResult && matchResult[1] === config.GAIA_DEV_PIXELS_PER_PX) {
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

  if (utils.isSubjectToBranding(file.path)) {
    file.append((config.OFFICIAL == 1) ? 'official' : 'unofficial');
  }

  if (!file.exists()) {
    throw new Error('Can\'t add inexistent file to zip : ' + file.path);
  }
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
        l10nFile.append(file.leafName + '.' + config.GAIA_DEFAULT_LOCALE);
        if (l10nFile.exists()) {
          addEntryFileWithTime(zip, pathInZip, l10nFile, DEFAULT_TIME,
            compression);
          return;
        }
      }

      let re = new RegExp('\\.html\\.' + config.GAIA_DEFAULT_LOCALE);
      if (!zip.hasEntry(pathInZip) && !re.test(file.leafName)) {
        addEntryFileWithTime(zip, pathInZip, file, DEFAULT_TIME, compression);
      }
    } catch (e) {
      throw new Error('Unable to add following file in zip: ' +
                      file.path + '\n' + e);
    }
  }
  // Case 2/ Directory
  else if (file.isDirectory()) {
    debug(' +directory to zip ' + pathInZip);

    if (!zip.hasEntry(pathInZip)) {
      zip.addEntryDirectory(pathInZip, DEFAULT_TIME, false);
    }
  }
}

/**
 * Copy a "Building Block" (i.e. shared style resource)
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       blockName name of the building block to copy.
 * @param {String}       dirName   name of the shared directory to use.
 */
function copyBuildingBlock(zip, blockName, dirName, webapp) {
  let dirPath = '/shared/' + dirName + '/';

  // Compute the nsIFile for this shared style
  let styleFolder = utils.getGaia(config).sharedFolder.clone();
  styleFolder.append(dirName);
  let cssFile = styleFolder.clone();
  if (!styleFolder.exists()) {
    throw new Error('Using inexistent shared style: ' + blockName);
  }

  cssFile.append(blockName + '.css');
  var pathInZip = dirPath + blockName + '.css';
  var compression = getCompression(pathInZip, webapp);
  addToZip(zip, pathInZip, cssFile, compression);

  // Copy everything but index.html and any other HTML page into the
  // style/<block> folder.
  let subFolder = styleFolder.clone();
  subFolder.append(blockName);
  utils.ls(subFolder, true).forEach(function(file) {
      let relativePath = file.getRelativeDescriptor(styleFolder);
      // Ignore HTML files at style root folder
      if (relativePath.match(/^[^\/]+\.html$/)) {
        return;
      }
      // Do not process directory as `addToZip` will add files recursively
      if (file.isDirectory()) {
        return;
      }
      addToZip(zip, dirPath + relativePath, file);
    });
}

function customizeFiles(zip, src, dest, webapp) {
  // Add customize file to the zip
  var distDir = utils.getGaia(config).distributionDir;
  let files = utils.ls(utils.getFile(distDir, src));
  files.forEach(function(file) {
    let filename = dest + file.leafName;
    if (zip.hasEntry(filename)) {
      zip.removeEntry(filename, false);
    }
    addEntryFileWithTime(zip, filename, file, DEFAULT_TIME,
      getCompression(filename, webapp));
  });
}

function execute(options) {
  config = options;
  var gaia = utils.getGaia(config);
  var localesFile = utils.resolve(config.LOCALES_FILE,
    config.GAIA_DIR);
  if (!localesFile.exists()) {
    throw new Error('LOCALES_FILE doesn\'t exists: ' + localesFile.path);
  }

  let webappsTargetDir = Cc['@mozilla.org/file/local;1']
                           .createInstance(Ci.nsILocalFile);
  webappsTargetDir.initWithPath(config.PROFILE_DIR);

  // Create profile folder if doesn't exists
  utils.ensureFolderExists(webappsTargetDir);

  // Create webapps folder if doesn't exists
  webappsTargetDir.append('webapps');
  utils.ensureFolderExists(webappsTargetDir);

  gaia.webapps.forEach(function(webapp) {
    // If config.BUILD_APP_NAME isn't `*`, we only accept one webapp
    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME) {
      return;
    }

    // Zip generation is not needed for external apps, aaplication data
    // is copied to profile webapps folder in webapp-manifests.js
    if (utils.isExternalApp(webapp)) {
      return;
    }

    // Compute webapp folder name in profile
    let webappTargetDir = webappsTargetDir.clone();
    webappTargetDir.append(webapp.domain);
    utils.ensureFolderExists(webappTargetDir);

    let zip = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);

    let mode = PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE;

    let zipFile = webappTargetDir.clone();
    zipFile.append('application.zip');
    zip.open(zipFile, mode);

    // Add webapp folder to the zip
    debug('# Create zip for: ' + webapp.domain);
    let files = utils.ls(webapp.buildDirectoryFile, true);
    files.forEach(function(file) {
      if (!exclude(file.path, options, webapp.buildDirectoryFile.path)) {
        var pathInZip = file.path.substr(
          webapp.buildDirectoryFile.path.length + 1);
        var compression = getCompression(pathInZip, webapp);
        pathInZip = pathInZip.replace(/\\/g, '/');
        addToZip(zip, pathInZip, file, compression);
      }
    });

    // Put shared files, but copy only files actually used by the webapp.
    // We search for shared file usage by parsing webapp source code.
    let EXTENSIONS_WHITELIST = ['html'];
    let SHARED_USAGE =
        /<(?:script|link).+=['"]\.?\.?\/?shared\/([^\/]+)\/([^''\s]+)("|')/g;

    let used = {
      js: [],              // List of JS file paths to copy
      locales: [],         // List of locale names to copy
      resources: [],       // List of resources to copy
      styles: [],          // List of stable style names to copy
      unstable_styles: []  // List of unstable style names to copy
    };

    function sortResource(kind, path) {
      switch (kind) {
        case 'js':
          if (used.js.indexOf(path) == -1) {
            used.js.push(path);
          }
          break;
        case 'locales':
          if (config.GAIA_INLINE_LOCALES !== '1') {
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
          let styleName = path.substr(0, path.lastIndexOf('.'));
          if (used.styles.indexOf(styleName) == -1) {
            used.styles.push(styleName);
          }
          break;
        case 'style_unstable':
          let unstableStyleName = path.substr(0, path.lastIndexOf('.'));
          if (used.unstable_styles.indexOf(unstableStyleName) == -1) {
            used.unstable_styles.push(unstableStyleName);
          }
          break;
      }
    }

    // Scan the files
    let files = utils.ls(webapp.buildDirectoryFile, true);
    files.filter(function(file) {
        // Process only files that may require a shared file
        let extension = utils.getExtension(file.leafName);
        return file.isFile() && EXTENSIONS_WHITELIST.indexOf(extension) != -1;
      }).
      forEach(function(file) {
        // Grep files to find shared/* usages
        let content = utils.getFileContent(file);
        while ((matches = SHARED_USAGE.exec(content)) !== null) {
          let kind = matches[1]; // js | locales | resources | style
          let path = matches[2];
          sortResource(kind, path);
        }
      });

    if (gaia.l10nManager) {
      // Only localize app manifest file if we inlined properties files.
      var inlineOrConcat = (config.GAIA_INLINE_LOCALES === '1' ||
        config.GAIA_CONCAT_LOCALES === '1');
      gaia.l10nManager.localize(files, zip, webapp, inlineOrConcat);
    }


    // Look for gaia_shared.json in case app uses resources not specified
    // in HTML
    let sharedDataFile = webapp.buildDirectoryFile.clone();
    sharedDataFile.append('gaia_shared.json');
    if (sharedDataFile.exists()) {
      let sharedData = JSON.parse(utils.getFileContent(sharedDataFile));
      Object.keys(sharedData).forEach(function(kind) {
        sharedData[kind].forEach(function(path) {
          sortResource(kind, path);
        });
      });
    }

    used.js.forEach(function(path) {
      // Compute the nsIFile for this shared JS file
      let file = gaia.sharedFolder.clone();
      file.append('js');
      path.split('/').forEach(function(segment) {
        file.append(segment);
      });
      if (!file.exists()) {
        throw new Error('Using inexistent shared JS file: ' + path + ' from: ' +
                        webapp.domain);
      }
      var pathInZip = '/shared/js/' + path;
      var compression = getCompression(pathInZip, webapp);
      addToZip(zip, pathInZip, file, compression);
    });

    used.locales.forEach(function(name) {
      // Compute the nsIFile for this shared locale
      let localeFolder = gaia.sharedFolder.clone();
      localeFolder.append('locales');
      let ini = localeFolder.clone();
      localeFolder.append(name);
      if (!localeFolder.exists()) {
        throw new Error('Using inexistent shared locale: ' + name + ' from: ' +
                        webapp.domain);
      }
      ini.append(name + '.ini');
      if (!ini.exists()) {
        throw new Error(name + ' locale doesn`t have `.ini` file.');
      }
      // And the locale folder itself
      addToZip(zip, 'shared/locales/' + name, localeFolder);

      // Add the .ini file
      var pathInZip = 'shared/locales/' + name + '.ini';
      var compression = getCompression(pathInZip, webapp);
      if (!gaia.l10nManager) {
        addToZip(zip, pathInZip, ini, compression);
      } else {
        gaia.l10nManager.localizeIni(zip, ini, webapp, pathInZip, compression);
      }

      utils.ls(localeFolder, true).forEach(function(fileInSharedLocales) {
        var relativePath =
          fileInSharedLocales.path.substr(config.GAIA_DIR.length);
        var compression = getCompression(relativePath, webapp);
        addToZip(zip, relativePath, fileInSharedLocales, compression);
      });
    });

    used.resources.forEach(function(path) {
      // Compute the nsIFile for this shared resource file
      let file = gaia.sharedFolder.clone();
      file.append('resources');
      path.split('/').forEach(function(segment) {
        file.append(segment);
        if (utils.isSubjectToBranding(file.path)) {
          file.append((config.OFFICIAL == 1) ? 'official' : 'unofficial');
        }
      });
      if (!file.exists()) {
        throw new Error('Using inexistent shared resource: ' + path +
                        ' from: ' + webapp.domain + '\n');
      }

      if (path === 'languages.json') {
        var pathInZip = 'shared/resources/languages.json';
        return addToZip(zip, pathInZip, localesFile,
          getCompression(pathInZip, webapp));
      }

      // Add not only file itself but all its hidpi-suffixed versions.
      let fileNameRegexp = new RegExp(
          '^' + file.leafName.replace(/(\.[a-z]+$)/, '(@.*x)?\\$1') + '$');
      utils.ls(file.parent, false).forEach(function(listFile) {
        if (fileNameRegexp.test(listFile.leafName)) {
          var pathInZip = '/shared/resources/' + path;
          addToZip(zip, pathInZip, listFile, getCompression(pathInZip, webapp));
        }
      });

      if (file.isDirectory()) {
        utils.ls(file, true).forEach(function(fileInResources) {
          var pathInZip = 'shared' +
            fileInResources.path.substr(gaia.sharedFolder.path.length);
          addToZip(zip, pathInZip, fileInResources,
            getCompression(pathInZip, webapp));
        })
      }

      if (path === 'media/ringtones/' && gaia.distributionDir &&
        utils.getFile(gaia.distributionDir, 'ringtones').exists()) {
        customizeFiles(zip, 'ringtones', 'shared/resources/media/ringtones/',
          webapp);
      }
    });

    used.styles.forEach(function(name) {
      try {
        copyBuildingBlock(zip, name, 'style', webapp);
      } catch (e) {
        throw new Error(e + ' from: ' + webapp.domain);
      }
    });

    used.unstable_styles.forEach(function(name) {
      try {
        copyBuildingBlock(zip, name, 'style_unstable', webapp);
      } catch (e) {
        throw new Error(e + ' from: ' + webapp.domain);
      }
    });

    if (zip.alignStoredFiles) {
      zip.alignStoredFiles(4096);
    }
    zip.close();
  });
}

exports.execute = execute;
exports.addEntryFileWithTime = addEntryFileWithTime;
exports.addEntryStringWithTime = addEntryStringWithTime;
