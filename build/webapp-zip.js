/**
 * Zip app from build_stage to profile.
 * Additionally, it will also filter images by resolution and some excluded
 * conditions, which should move to other task, bug 1010095.
 */
/* global require, exports, dump */
'use strict';
var utils = require('./utils');

var WebappZip = function() {
  this.config = null;
  this.webapp = null;
  this.buildDir = null;
  this.zipFile = null;
};

WebappZip.prototype.setOptions = function(options) {
  this.config = options.config;
  this.webapp = options.webapp;
  this.buildDir = this.webapp.buildDirectoryFile;

  var targetDir = options.targetDir;
  var targetAppFolder = targetDir.clone();
  targetAppFolder.append(this.webapp.domain);
  utils.ensureFolderExists(targetAppFolder);

  var zipContent = targetAppFolder.clone();
  zipContent.append('application.zip');
  // PR_CREATE_FILE | PR_CREATE_FILE | PR_TRUNCATE
  var mode = 0x04 | 0x08 | 0x20;
  this.zipFile = utils.createZip();
  this.zipFile.open(zipContent, mode);
};

WebappZip.prototype.getCompression = function(pathInZip) {
  var webapp = this.webapp;
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
  } catch (e) {
    dump('isExcludedFromZip error, file.path: ' + file.path + '\n');
    throw(e);
  }
  var self = this;
  var excludedFuncs = [
    function fileExist(file) {
      return !file.exists();
    },
    function isLocales(file) {
      return self.config.GAIA_CONCAT_LOCALES === '1' &&
        /locales[^-]/.test(file.path);
    },
    function isBuild(file) {
      var appDirPath = self.webapp.sourceDirectoryName;
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
    function fileHidden(file) {
      return file.isHidden();
    },
    function isTest(file) {
      var appPath = self.buildDir;
      var path = file.path.substr(appPath.path.length + 1).split(/[\\/]/)[0];
      return path === 'test';
    },
    function isGit(file) {
      var appPath = self.buildDir;
      var path = file.path.substr(appPath.path.length + 1).split(/[\\/]/)[0];
      return path === '.git';
    },
    function isL10n(file) {
      return (self.config.GAIA_CONCAT_LOCALES === '1' &&
        (file.leafName === 'locales' || file.parent.leafName === 'locales'));
    },
    function isConcatenatedL10n(file) {
      return ((file.leafName === 'locales-obj' ||
        file.parent.leafName === 'locales-obj') &&
        self.config.GAIA_CONCAT_LOCALES !== '1');
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
    this.buildDir.path.length + 1);
  var compression = this.getCompression(pathInZip);
  pathInZip = pathInZip.replace(/\\/g, '/');

  if (!pathInZip) {
    return;
  }

  // nsIZipWriter should not receive any path starting with `/`,
  // it would put files in a folder with empty name...
  pathInZip = pathInZip.replace(/^\/+/, '');

  // Regular file
  if (file.isFile()) {
    try {
      if (/\.html$/.test(file.leafName)) {
        // this file might have been pre-translated for the default locale
        var l10nFile = file.parent.clone();
        l10nFile.append(file.leafName + '.' + this.config.GAIA_DEFAULT_LOCALE);
        if (l10nFile.exists()) {
          utils.addEntryContentWithTime(this.zipFile, pathInZip, l10nFile,
            0, compression);
          return;
        }
      }

      var re = new RegExp('\\.html\\.' + this.config.GAIA_DEFAULT_LOCALE);
      if (!this.zipFile.hasEntry(pathInZip) && !re.test(file.leafName)) {
        utils.addEntryContentWithTime(this.zipFile, pathInZip, file,
          0, compression);
      }
    } catch (e) {
      throw new Error('Unable to add following file in zip: ' +
                      file.path + '\n' + e);
    }
  }
};

WebappZip.prototype.closeZip = function() {
  if (this.zipFile.alignStoredFiles) {
    this.zipFile.alignStoredFiles(4096);
  }
  this.zipFile.close();
};

WebappZip.prototype.execute = function(options) {
  // If config.BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (options.config.BUILD_APP_NAME != '*' &&
    options.webapp.sourceDirectoryName != options.config.BUILD_APP_NAME) {
    return;
  }

  // Zip generation is not needed for external apps, aaplication data
  // is copied to profile webapps folder in webapp-manifests.js
  if (utils.isExternalApp(options.webapp)) {
    return;
  }

  this.setOptions(options);

  var files = utils.ls(this.buildDir, true);
  files.forEach(this.addToZip.bind(this));

  this.closeZip();
};

function execute(options) {
  var targetWebapp = utils.getWebapp(options.APP_DIR,
    options.GAIA_DOMAIN, options.GAIA_SCHEME,
    options.GAIA_PORT, options.STAGE_DIR);

  var webappsTargetDir = utils.getFile(options.PROFILE_DIR);
  // Create profile folder if doesn't exists
  utils.ensureFolderExists(webappsTargetDir);

  // Create webapps folder if doesn't exists
  webappsTargetDir.append('webapps');

  (new WebappZip()).execute({
    config: options,
    targetDir: webappsTargetDir,
    webapp: targetWebapp
  });
}

exports.execute = execute;
exports.WebappZip = WebappZip;
