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

/**
 * XXX: Before we can pull LockScreenInputpad out, we need this to split
 * LockScreenInputpad and LockScreen while still merge them into one file.
 * (Bug 1053680).
 */
SystemAppBuilder.prototype.integrateLockScreenInputpad = function(options) {
  var stagePath = options.STAGE_APP_DIR;
  var lockscreenInputpadFrameElement =
    '<div id="lockscreen-inputpad-frame-placeholder"></div>';
  // Paths must indicate to the files in build stage directory.
  var lockscreenInputpadFramePath =
    [stagePath, 'lockscreen', 'lockscreen_inputpad_frame.html'];
  var systemIndexPath = [stagePath, 'index.html'];
  var systemIndexFile = utils.getFile.apply(utils, systemIndexPath);
  var lockscreenInputpadContent = utils.getFileContent(
      utils.getFile.apply(utils, lockscreenInputpadFramePath));
  var systemIndexContent = utils.getFileContent(
      systemIndexFile);
  var replacedIndexContent = systemIndexContent.replace(
      lockscreenInputpadFrameElement,
      lockscreenInputpadContent);
  utils.writeContent(systemIndexFile, replacedIndexContent);
};

SystemAppBuilder.prototype.inlineDeviceType = function(options) {
  var stagePath = options.STAGE_APP_DIR;
  var deviceType = options.GAIA_DEVICE_TYPE;
  var basemodulePath = [stagePath, 'js', 'base_module.js'];
  var basemoduleFile = utils.getFile.apply(utils, basemodulePath);
  var basemoduleContent = utils.getFileContent(basemoduleFile);
  var featureDetectorPath = [stagePath, 'js', 'feature_detector.js'];
  var featureDetectorFile = utils.getFile.apply(utils, featureDetectorPath);
  var featureDetectorContent = utils.getFileContent(featureDetectorFile);

  // `this.deviceType = '_GAIA_DEVICE_TYPE_';` will be replaced by real device
  // type, take phone for example, result will be: this.deviceType = 'phone';
  // Only override necessary modules below in build time.
  // For common case, using standard method Service.query('getDeviceType') to
  // get device type
  utils.writeContent(
    basemoduleFile,
    basemoduleContent.replace(
      /this\.deviceType = \'_GAIA_DEVICE_TYPE_\';/,
      'this.deviceType = \'' + deviceType + '\';')
  );

  utils.writeContent(
    featureDetectorFile,
    featureDetectorContent.replace(
      /this\.deviceType = \'_GAIA_DEVICE_TYPE_\';/,
      'this.deviceType = \'' + deviceType + '\';')
  );
};

SystemAppBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  this.setOptions(options);
  this.initConfigJsons();
  if (this.distDirPath) {
    this.addCustomizeFiles();
  }
  this.integrateLockScreen(options);
  this.integrateLockScreenInputpad(options);
  this.inlineDeviceType(options);
};

exports.execute = function(options) {
  (new SystemAppBuilder()).execute(options);
};
