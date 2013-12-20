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
function addEntryFileWithTime(zip, pathInZip, file, time) {
  let fis = Cc['@mozilla.org/network/file-input-stream;1'].
              createInstance(Ci.nsIFileInputStream);
  fis.init(file, -1, -1, 0);

  zip.addEntryStream(
    pathInZip, time, Ci.nsIZipWriter.COMPRESSION_BEST, fis, false);
  fis.close();
}

/**
 * Add a string to a zip file with the specified time
 */
function addEntryStringWithTime(zip, pathInZip, data, time) {
  let sis = Cc['@mozilla.org/io/string-input-stream;1'].
              createInstance(Ci.nsIStringInputStream);
  sis.data = data;

  zip.addEntryStream(
    pathInZip, time, Ci.nsIZipWriter.COMPRESSION_DEFAULT, sis, false);
  sis.close();
}

/**
 * Add a file or a directory, recursively, to a zip file
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       pathInZip relative path to use in zip.
 * @param {nsIFile}      file      file xpcom to add.
 */
function addToZip(zip, pathInZip, file) {
  let suffix = '@' + config.GAIA_DEV_PIXELS_PER_PX + 'x';
  if (file.isHidden())
    return;

  // If config.GAIA_DEV_PIXELS_PER_PX is not 1 and the file is a bitmap let's check
  // if there is a bigger version in the directory. If so let's ignore the
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
        l10nFile.append(file.leafName + '.' + config.GAIA_DEFAULT_LOCALE);
        if (l10nFile.exists()) {
          addEntryFileWithTime(zip, pathInZip, l10nFile, DEFAULT_TIME);
          return;
        }
      }

      let re = new RegExp('\\.html\\.' + config.GAIA_DEFAULT_LOCALE);
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

    let files = utils.ls(file);
    files.forEach(function(subFile) {
        let subPath = pathInZip + subFile.leafName;
        addToZip(zip, subPath, subFile);
      });
  }
}

/**
 * Copy a "Building Block" (i.e. shared style resource)
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       blockName name of the building block to copy.
 * @param {String}       dirName   name of the shared directory to use.
 */
function copyBuildingBlock(zip, blockName, dirName) {
  let dirPath = '/shared/' + dirName + '/';

  // Compute the nsIFile for this shared style
  let styleFolder = utils.getGaia(config).sharedFolder.clone();
  styleFolder.append(dirName);
  let cssFile = styleFolder.clone();
  if (!styleFolder.exists()) {
    throw new Error('Using inexistent shared style: ' + blockName);
  }

  cssFile.append(blockName + '.css');
  addToZip(zip, dirPath + blockName + '.css', cssFile);

  // Copy everything but index.html and any other HTML page into the
  // style/<block> folder.
  let subFolder = styleFolder.clone();
  subFolder.append(blockName);
  utils.ls(subFolder, true).forEach(function(file) {
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
  var distDir = utils.getGaia(config).distributionDir;
  let files = utils.ls(utils.getFile(distDir, src));
  files.forEach(function(file) {
    let filename = dest + file.leafName;
    if (zip.hasEntry(filename)) {
      zip.removeEntry(filename, false);
    }
    addEntryFileWithTime(zip, filename, file, DEFAULT_TIME);
  });
}

function getResource(distDir, path, resources, json, key) {
  if (path) {
    file = utils.getFile(distDir, path);
    if (!file.exists()) {
      throw new Error('Invalid single variant configuration: ' +
                      file.path + ' not found');
    }

    resources.push(file);
    json[key] = '/resources/' + file.leafName;
  }
}

function getSingleVariantResources(conf) {
  var distDir = utils.getGaia(config).distributionDir;
  conf = utils.getJSON(conf);

  let output = {};
  let resources = [];
  conf['operators'].forEach(function(operator) {
    let object = {};

    getResource(distDir, operator['wallpaper'], resources, object, 'wallpaper');
    getResource(distDir, operator['default_contacts'], resources, object, 'default_contacts');
    getResource(distDir, operator['support_contacts'], resources, object, 'support_contacts');

    let ringtone = operator['ringtone'];
    if (ringtone) {
      let ringtoneName = ringtone['name'];
      if (!ringtoneName) {
        throw new Error('Missing name for ringtone in single variant conf.');
      }

      getResource(distDir, ringtone['path'], resources, object, 'ringtone');
      if (!object.ringtone) {
        throw new Error('Missing path for ringtone in single variant conf.');
      }

      // Generate ringtone JSON
      let uuidGenerator = Cc['@mozilla.org/uuid-generator;1'].
                            createInstance(Ci.nsIUUIDGenerator);
      let ringtoneObj = { filename: uuidGenerator.generateUUID().toString() + '.json',
                          content: { uri: object['ringtone'],
                                     name: ringtoneName }};

      resources.push(ringtoneObj);
      object['ringtone'] = '/resources/' + ringtoneObj.filename;
    }

    operator['mcc-mnc'].forEach(function(mcc) {
      if (Object.keys(object).length != 0) {
        output[mcc] = object;
      }
    });
  });

  return {'conf': output, 'files': resources};
}

function execute(options) {
  config = options;
  var gaia = utils.getGaia(config);
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
    if (config.BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != config.BUILD_APP_NAME)
      return;

    // Zip generation is not needed for external apps, aaplication data is copied to profile
    // webapps folder in webapp-manifests.js
    if (webapp.metaData) {
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
    let files = utils.ls(webapp.buildDirectoryFile);
    files.forEach(function(file) {
        // Ignore l10n files if they have been inlined or concatenated
        if ((config.GAIA_INLINE_LOCALES === '1' || config.GAIA_CONCAT_LOCALES === '1') &&
            (file.leafName === 'locales' || file.leafName === 'locales.ini'))
          return;

        // Ignore concatenated l10n files if config.GAIA_CONCAT_LOCALES is not set
        if (file.leafName === 'locales-obj' && config.GAIA_CONCAT_LOCALES !== '1')
          return;

        // Ignore files from /shared directory (these files were created by
        // Makefile code). Also ignore files in the /test directory.
        if (file.leafName !== 'shared' && file.leafName !== 'test')
          addToZip(zip, '/' + file.leafName, file);
      });

    if (webapp.sourceDirectoryName === 'system' && gaia.distributionDir) {
      if (utils.getFile(gaia.distributionDir, 'power').exists()) {
        customizeFiles(zip, 'power', 'resources/power/');
      }
    }

    if (webapp.sourceDirectoryName === 'wallpaper' && gaia.distributionDir &&
      utils.getFile(gaia.distributionDir, 'wallpapers').exists()) {
      customizeFiles(zip, 'wallpapers', 'resources/320x480/');
    }

    if (webapp.sourceDirectoryName === 'homescreen' && gaia.distributionDir) {
      let customization = utils.getFile(gaia.distributionDir, 'temp', 'apps', 'conf', 'singlevariantconf.json');
      if (customization.exists()) {
        addToZip(zip,'js/singlevariantconf.json', customization);
      }
    }

    if (webapp.sourceDirectoryName === 'communications' && gaia.distributionDir &&
      utils.getFile(gaia.distributionDir).exists()) {
      let conf = utils.getFile(gaia.distributionDir, 'variant.json');
      if (conf.exists()) {
        let resources = getSingleVariantResources(conf);

        addEntryStringWithTime(zip, 'resources/customization.json', JSON.stringify(resources.conf), DEFAULT_TIME);

        resources.files.forEach(function(file) {
          if (file instanceof Ci.nsILocalFile) {
            let filename = 'resources/' + file.leafName;
            if (zip.hasEntry(filename)) {
              zip.removeEntry(filename, false);
            }
            addEntryFileWithTime(zip, filename, file, DEFAULT_TIME);
          } else {
            let filename = 'resources/' + file.filename;
            if (zip.hasEntry(filename)) {
              zip.removeEntry(filename, false);
            }
            addEntryStringWithTime(zip, filename, JSON.stringify(file.content), DEFAULT_TIME);
          }
        });
      } else {
        dump(conf.path + ' not found. Single variant resources will not be added.\n');
      }
    }

    // The keyboard has a custom manifest file generated by webapp-manifets.js
    // We want to copy that custom generated manifest into the zip file instead
    // of the file that is in the source directory.
    if (webapp.sourceDirectoryName === 'keyboard') {
      if (zip.hasEntry(MANIFEST_FILENAME)) {
        zip.removeEntry(MANIFEST_FILENAME, false);
      }
      addToZip(zip, MANIFEST_FILENAME,
               utils.getFile(webappTargetDir.path, MANIFEST_FILENAME));
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
      styles: [],          // List of stable style names to copy
      unstable_styles: []  // List of unstable style names to copy
    };

    function sortResource(kind, path) {
      switch (kind) {
        case 'js':
          if (used.js.indexOf(path) == -1)
            used.js.push(path);
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
          if (used.styles.indexOf(styleName) == -1)
            used.styles.push(styleName);
          break;
        case 'style_unstable':
          let unstableStyleName = path.substr(0, path.lastIndexOf('.'));
          if (used.unstable_styles.indexOf(unstableStyleName) == -1)
            used.unstable_styles.push(unstableStyleName);
          break;
      }
    }

    // Scan the files
    let files = utils.ls(webapp.buildDirectoryFile, true);
    files.filter(function(file) {
        // Process only files that may require a shared file
        let extension = file.leafName
                            .substr(file.leafName.lastIndexOf('.') + 1)
                            .toLowerCase();
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

    // Look for gaia_shared.json in case app uses resources not specified in HTML
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
      addToZip(zip, '/shared/js/' + path, file);
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
      if (!ini.exists())
        throw new Error(name + ' locale doesn`t have `.ini` file.');

      // Add the .ini file
      addToZip(zip, '/shared/locales/' + name + '.ini', ini);
      // And the locale folder itself
      addToZip(zip, '/shared/locales/' + name, localeFolder);
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
        return;
      }

      // Add not only file itself but all its hidpi-suffixed versions.
      let fileNameRegexp = new RegExp(
          '^' + file.leafName.replace(/(\.[a-z]+$)/, '(@.*x)?\\$1') + '$');
      utils.ls(file.parent, false).forEach(function(listFile) {
        if (fileNameRegexp.test(listFile.leafName)) {
          addToZip(zip, '/shared/resources/' + path, listFile);
        }
      });

      if (path === 'media/ringtones/' && gaia.distributionDir &&
        utils.getFile(gaia.distributionDir, 'ringtones').exists()) {
        customizeFiles(zip, 'ringtones', 'shared/resources/media/ringtones/');
      }
    });

    used.styles.forEach(function(name) {
      try {
        copyBuildingBlock(zip, name, 'style');
      } catch (e) {
        throw new Error(e + ' from: ' + webapp.domain);
      }
    });

    used.unstable_styles.forEach(function(name) {
      try {
        copyBuildingBlock(zip, name, 'style_unstable');
      } catch (e) {
        throw new Error(e + ' from: ' + webapp.domain);
      }
    });

    zip.close();
  });
}

exports.execute = execute;
