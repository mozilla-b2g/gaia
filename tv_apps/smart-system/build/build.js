'use strict';

/* global require, exports */
var utils = require('utils');

var SystemAppBuilder = function() {
};

// set options
SystemAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
};

SystemAppBuilder.prototype.addCustomizeFiles = function() {
  if (!utils.getFile(this.distDirPath, 'power').exists()) {
    return;
  }
  var self = this;
  var fileDir = utils.getFile(this.distDirPath, 'power');
  var files = utils.ls(fileDir);
  files.forEach(function(file) {
    utils.copyFileTo(file.path,
      utils.joinPath(self.stageDir.path, 'resources', 'power'), file.leafName);
  });
};

SystemAppBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  this.setOptions(options);
  if (this.distDirPath) {
    this.addCustomizeFiles();
  }
};

exports.execute = function(options) {
  (new SystemAppBuilder()).execute(options);
};
