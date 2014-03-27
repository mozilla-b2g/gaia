'use strict';

/* global require, exports */
var utils = require('utils');
var config = require('./customizeConfig.js');
var DEFAULT_VALUE = {
  maxImagePixelSize: 5 * 1024 * 1024,
  maxSnapshotPixelSize: 5 * 1024 * 1024,

  // An estimated JPEG compression ratio expected from an average photo. Use
  // a default assumption of 8:1 compression for high quality. This default
  // value is derived from sample images taken with a variety of devices.
  //
  // Reference: http://en.wikipedia.org/wiki/JPEG#Effects_of_JPEG_compression
  avgJpegCompressionRatio: 8
};
var CameraAppBuilder = function() {
};

CameraAppBuilder.prototype.APP_DIR = 'apps/camera';

CameraAppBuilder.prototype.setOptions = function(options) {
  var appDirPath = [options.GAIA_DIR].concat(this.APP_DIR.split('/'));
  this.appDir = utils.getFile.apply(utils, appDirPath);
};

CameraAppBuilder.prototype.customizeMaximumImageSize = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;
  var customize = JSON.parse(utils.getDistributionFileContent('camera',
                    DEFAULT_VALUE, distDir));
  
  var content = config.customizeMaximumImageSize(customize);
  var file = utils.getFile(this.appDir.path, 'js', 'config.js');
  utils.writeContent(file, content);
};

CameraAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.customizeMaximumImageSize(options);
};

exports.execute = function(options) {
  (new CameraAppBuilder()).execute(options);
};
