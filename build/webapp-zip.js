'use strict';

/**
 * Generate $(PROFILE_FOLDER)/webapps/APP/application.zip from build_stage
 * to profile.
 * Additionally, it will also filter images by resolution and some excluded
 * conditions, which should move to other task, bug 1010095.
 */

var utils = require('./utils');

var WebappZip = function() {
  this.options = null;
  this.zipFile = null;
};

WebappZip.prototype.setOptions = function(options) {
  this.options = options;

  var targetAppFolder = utils.getFile(options.webapp.profileDirectoryFilePath);
  utils.ensureFolderExists(targetAppFolder);
  this.zipPath = utils.joinPath(targetAppFolder.path, 'application.zip');
  this.zipFile = utils.createZip(this.zipPath);
};

WebappZip.prototype.getCompression = function(pathInZip) {
  var webapp = this.options.webapp;
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
};

WebappZip.prototype.isExcludedFromZip = function(file) {
  try {
    if (!(file && file.exists() && file.isFile())) {
      return true;
    }
  } catch (err) {
    utils.log('webapp-zip', 'isExcludedFromZip error with ' + file.path + '\n');
    throw(err);
  }
  var options = this.options;
  var excludedFuncs = [
    function fileExist(file) {
      return !file.exists();
    },
    function isLocales(file) {
      return options.GAIA_CONCAT_LOCALES === '1' &&
        /locales[^-]/.test(file.path);
    },
    function isSpecificProperties(file) {
      if(utils.getExtension(file.path) === 'properties' &&
        file.path.indexOf('locales') !== -1 &&
        options.GAIA_CONCAT_LOCALES === '0' &&
        options.LOCALE_BASEDIR && options.LOCALES_FILE) {
        let localesFile = utils.resolve(options.LOCALES_FILE, options.GAIA_DIR);
        if (!localesFile.exists()) {
          throw new Error('file not found: ' + localesFile.path);
        }
        let locales = Object.keys(utils.getJSON(localesFile));

        return !locales.some(function(locale) {
          return file.path.indexOf(locale + '.properties') !== -1;
        });
      }
      return false;
    },
    function isBuild(file) {
      var appDirPath = options.webapp.sourceDirectoryName;
      return new RegExp(utils.joinPath(appDirPath, 'build')
        .replace(/\\/g, '\\\\') + '|build.txt')
        .test(file.path);
    },
    function isMakefile(file) {
      return /Makefile/.test(file.path);
    },
    function isReadme(file) {
      return /README/.test(file.path);
    },
    function isPackageJSON(file) {
      return /package\.json/.test(file.path);
    },
    function fileHidden(file) {
      return file.isHidden();
    },
    function isTest(file) {
      var appPath = options.webapp.buildDirectoryFilePath;
      var path = file.path.substr(appPath.length + 1).split(/[\\/]/)[0];
      return path === 'test';
    },
    function isGit(file) {
      var appPath = options.webapp.buildDirectoryFilePath;
      var path = file.path.substr(appPath.length + 1).split(/[\\/]/)[0];
      return path === '.git';
    },
    function isL10n(file) {
      return (options.GAIA_CONCAT_LOCALES === '1' &&
        (file.leafName === 'locales' ||
          utils.getFile(file.path, '..').leafName === 'locales'));
    },
    function isConcatenatedL10n(file) {
      return ((file.leafName === 'locales-obj' ||
        utils.getFile(file.path, '..').leafName === 'locales-obj') &&
        options.GAIA_CONCAT_LOCALES !== '1');
    }
  ];
  for (var index in excludedFuncs) {
    if (!excludedFuncs[index](file)) {
      continue;
    } else {
      return true;
    }
  }
  return false;
};

WebappZip.prototype.addToZip = function(file) {
  if (this.isExcludedFromZip(file)) {
    return;
  }

  var pathInZip = file.path.substr(
    this.options.webapp.buildDirectoryFilePath.length + 1);
  var compression = this.getCompression(pathInZip);
  pathInZip = pathInZip.replace(/\\/g, '/');

  if (!pathInZip) {
    return;
  }

  // nsIZipWriter should not receive any path starting with `/`,
  // it would put files in a folder with empty name...
  pathInZip = pathInZip.replace(/^\/+/, '');
  var zip = this.zipFile;

  // Regular file
  if (file.isFile()) {
    if (/\.html$/.test(file.leafName)) {
      // This file might have been pre-translated for the default locale
      var l10nFile = utils.getFile(file.path + '.' +
        this.options.GAIA_DEFAULT_LOCALE);
      if (l10nFile.exists()) {
        utils.addFileToZip(zip, pathInZip, l10nFile, compression);
        return;
      }
    }

    var re = new RegExp('\\.html\\.' + this.options.GAIA_DEFAULT_LOCALE);
    if (!utils.hasFileInZip(zip, pathInZip) && !re.test(file.leafName)) {
      utils.addFileToZip(zip, pathInZip, file, compression);
    }
  }
};

WebappZip.prototype.execute = function(options) {
  options.webapp = utils.getWebapp(options.APP_DIR, options);
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (options.BUILD_APP_NAME != '*' &&
    options.webapp.sourceDirectoryName != options.BUILD_APP_NAME) {
    return;
  }

  // Zip generation is not needed for external apps, aaplication data
  // is copied to profile webapps folder in webapp-manifests.js
  if (utils.isExternalApp(options.webapp)) {
    return;
  }

  this.setOptions(options);

  var buildDir = utils.getFile(options.webapp.buildDirectoryFilePath);
  utils.ls(buildDir, true).forEach(this.addToZip.bind(this));

  utils.closeZip(this.zipFile, this.zipPath);
};

function execute(options) {
  var profileDir = utils.getFile(options.PROFILE_DIR);
  utils.ensureFolderExists(profileDir);
  var webappsDir = utils.getFile(options.COREWEBAPPS_DIR, 'webapps');
  utils.ensureFolderExists(webappsDir);

  (new WebappZip()).execute(options);
}

exports.execute = execute;
exports.WebappZip = WebappZip;
