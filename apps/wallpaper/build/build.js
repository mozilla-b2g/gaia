'use strict';

/* global require, exports */
var utils = require('utils');

var WallPaperAppBuilder = function(options) {
};

WallPaperAppBuilder.prototype.APP_DIR = 'apps/wallpaper';
WallPaperAppBuilder.prototype.BUILD_DIR = 'build_stage/wallpaper';
WallPaperAppBuilder.prototype.WALLPAPER_PATH = 'resources/320x480';

// set options
WallPaperAppBuilder.prototype.setOptions = function(options) {
  var distDirPath = [options.GAIA_DIR].concat(this.BUILD_DIR.split('/'));
  this.distDir = utils.getFile.apply(utils, distDirPath);

  var wallpaperDirPath =
    [options.GAIA_DIR].concat(this.BUILD_DIR.split('/'),
                              this.WALLPAPER_PATH.split('/'));
  this.wallpaperDir = utils.getFile.apply(utils, wallpaperDirPath);

  this.gaia = utils.getGaia(options);
};

// XXX This inherits the behavior of what's done before in bug 838110
// It did not remove file unlisted in list.json, and the dir name is wrong.
WallPaperAppBuilder.prototype.copyDistributionWallpapers = function() {
  if (!this.gaia.distributionDir) {
    return;
  }

  var dir = utils.getFile(this.gaia.distributionDir, 'wallpapers');
  if (!dir.exists()) {
    return;
  }

  utils.log('Include wallpapers in distribution directory ...\n');

  var files = utils.ls(dir);

  files.forEach(function(file) {
    file.copyTo(this.wallpaperDir, file.leafName);
  }, this);
};
WallPaperAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);

  this.copyDistributionWallpapers();
};

exports.execute = function(options) {
  (new WallPaperAppBuilder()).execute(options);
};
