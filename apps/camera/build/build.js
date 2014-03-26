'use strict';

/* global require, exports */
var utils = require('utils');
var config = require('./customizeConfig.js');
var DEFAULT_VALUE = {
  maxImagePixelSize: 5 * 1024 * 1024,
  maxSnapshotPixelSize: 5 * 1024 * 1024
};
var CameraAppBuilder = function() {
};

CameraAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);

  var jsDir = utils.getFile(this.stageDir.path, 'js');
  utils.ensureFolderExists(jsDir);
};

CameraAppBuilder.prototype.customizeMaximumImageSize = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;
  var customize = JSON.parse(utils.getDistributionFileContent('camera',
                    DEFAULT_VALUE, distDir));

  var content = config.customizeMaximumImageSize(customize);
  var file = utils.getFile(this.stageDir.path, 'js', 'config.js');
  utils.writeContent(file, content);
};

CameraAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.customizeMaximumImageSize(options);
};

exports.execute = function(options) {
  (new CameraAppBuilder()).execute(options);
};
