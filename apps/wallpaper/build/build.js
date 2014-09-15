'use strict';

/* global require, exports */
var utils = require('utils');

var WallPaperAppBuilder = function(options) {
};

WallPaperAppBuilder.prototype.APP_DIR = 'apps/wallpaper';
WallPaperAppBuilder.prototype.BUILD_DIR = 'build_stage/wallpaper';
WallPaperAppBuilder.prototype.WALLPAPER_PATH = 'resources/';

// set options
WallPaperAppBuilder.prototype.setOptions = function(options) {
  var wallpaperDirPath =
    [options.STAGE_APP_DIR].concat(this.WALLPAPER_PATH.split('/'));
  this.wallpaperDir = utils.getFile.apply(utils, wallpaperDirPath);

  this.gaia = utils.gaia.getInstance(options);
  this.configPath =
    utils.joinPath(options.APP_DIR, 'build', options.GAIA_DEVICE_TYPE);
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

WallPaperAppBuilder.prototype.copyWallpapers = function() {
  if (!this.configPath) {
    throw new Error('device config path not found');
  }

  var dir = utils.getFile(this.configPath, 'wallpapers');
  if (!dir.exists()) {
    return;
  }

  utils.log('Include wallpapers in app configuration directory ...\n');

  var files = utils.ls(dir);

  files.forEach(function(file) {
    file.copyTo(this.wallpaperDir, file.leafName);
  }, this);
};

WallPaperAppBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  this.setOptions(options);

  this.copyWallpapers();
  this.copyDistributionWallpapers();
};

exports.execute = function(options) {
  (new WallPaperAppBuilder()).execute(options);
};
