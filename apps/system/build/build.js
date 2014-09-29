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
      utils.joinPath(self.stageDir.path, 'resources', 'power'),
        file.leafName, true);
  });
};

SystemAppBuilder.prototype.initConfigJsons = function() {
  var iccDefault = {
    'defaultURL': 'http://www.mozilla.org/en-US/firefoxos/'
  };
  var wapuaprofDefault = {
  };
  var euRoamingDefault = {
  };
  var iccFile = utils.getFile(this.stageDir.path, 'resources', 'icc.json');
  var wapFile = utils.getFile(this.stageDir.path, 'resources',
    'wapuaprof.json');
  var euRoamingFile = utils.getFile(this.stageDir.path, 'resources',
    'eu-roaming.json');

  utils.writeContent(iccFile,
    utils.getDistributionFileContent('icc', iccDefault, this.distDirPath));

  utils.writeContent(wapFile,
    utils.getDistributionFileContent('wapuaprof',
      wapuaprofDefault, this.distDirPath));

  utils.writeContent(euRoamingFile,
    utils.getDistributionFileContent('eu-roaming',
      euRoamingDefault, this.distDirPath));

};

/**
 * XXX: Before we can pull LockScreen out, we need this to split
 * LockScreen and System app while still merge them into one file.
 * (Bug 1057198).
 */
SystemAppBuilder.prototype.integrateLockScreen = function(options) {
  var stagePath = options.STAGE_APP_DIR;
  var lockscreenFrameElement = '<div id="lockscreen-frame-placeholder"></div>';
  // Paths must indicate to the files in build stage directory.
  var lockscreenFramePath = [stagePath, 'lockscreen', 'lockscreen.html'];
  var systemIndexPath = [stagePath, 'index.html'];
  var systemIndexFile = utils.getFile.apply(utils, systemIndexPath);
  var lockscreenContent = utils.getFileContent(
      utils.getFile.apply(utils, lockscreenFramePath));
  var systemIndexContent = utils.getFileContent(
      systemIndexFile);
  var replacedIndexContent = systemIndexContent.replace(lockscreenFrameElement,
      lockscreenContent);
  utils.writeContent(systemIndexFile, replacedIndexContent);
};

SystemAppBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  this.setOptions(options);
  this.initConfigJsons();
  if (this.distDirPath) {
    this.addCustomizeFiles();
  }
  this.integrateLockScreen(options);
};

exports.execute = function(options) {
  (new SystemAppBuilder()).execute(options);
};
