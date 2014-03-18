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

function getCompression(pathInZip, webapp) {
  if (webapp.metaData && webapp.metaData.external === false &&
    webapp.metaData.zip && webapp.metaData.zip.mmap_files &&
    webapp.metaData.zip.mmap_files.indexOf(pathInZip) !== -1) {
    return utils.getCompression('none');
  } else {
    // Don't store some files compressed since that's not giving us any
    // benefit but costs cpu when reading from the zip.
    var ext = pathInZip.split('.').reverse()[0].toLowerCase();
    return (['jpg', 'jpeg'].indexOf(ext) !== -1) ?
            utils.getCompression('none') :
            utils.getCompression('best');
  }
}

function exclude(path, options, appPath) {
  var firstDir = path.substr(appPath.length+1).split(/[\\/]/)[0];
  var isShared = firstDir === 'shared';
  var isTest = firstDir === 'test';
  var isGit = firstDir === '.git';
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
  if (isTest) {
    return true;
  }

  // Ignore everything under .git/
  if (isGit) {
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
          utils.addEntryContentWithTime(zip, pathInZip, l10nFile, DEFAULT_TIME,
            compression);
          return;
        }
      }

      let re = new RegExp('\\.html\\.' + config.GAIA_DEFAULT_LOCALE);
      if (!zip.hasEntry(pathInZip) && !re.test(file.leafName)) {
        utils.addEntryContentWithTime(zip, pathInZip, file, DEFAULT_TIME, compression);
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

function getResource(distDir, path, resources, json, key) {
  if (path) {
    var file = utils.getFile(distDir, path);
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
    getResource(distDir, operator['default_contacts'],
      resources, object, 'default_contacts');
    getResource(distDir, operator['support_contacts'],
      resources, object, 'support_contacts');

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
      let ringtoneObj = { filename: uuidGenerator.generateUUID().toString() +
                                    '.json',
                          content: { uri: object['ringtone'],
                                     name: ringtoneName }};

      resources.push(ringtoneObj);
      object['ringtone'] = '/resources/' + ringtoneObj.filename;
    }

    operator['mcc-mnc'].forEach(function(mcc) {
      if (Object.keys(object).length !== 0) {
        output[mcc] = object;
      }
    });
  });

  return {'conf': output, 'files': resources};
}

function execute(options) {
  config = options;
  var gaia = utils.gaia.getInstance(config);

  let webappsTargetDir = Cc['@mozilla.org/file/local;1']
                           .createInstance(Ci.nsILocalFile);
  webappsTargetDir.initWithPath(config.PROFILE_DIR);

  // Create profile folder if doesn't exists
  utils.ensureFolderExists(webappsTargetDir);

  // Create webapps folder if doesn't exists
  webappsTargetDir.append('webapps');

  gaia.webapps.forEach(function(webapp) {
    // If config.BUILD_APP_NAME isn't `*`, we only accept one webapp
    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME) {
      return;
    }

    // Compute webapp folder name in profile
    let webappTargetDir = webappsTargetDir.clone();

    // Zip generation is not needed for external apps.
    if (utils.isExternalApp(webapp)) {
      return;
    }

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

    if (zip.alignStoredFiles) {
      zip.alignStoredFiles(4096);
    }
    zip.close();
  });

}

exports.execute = execute;
