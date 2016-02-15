'use strict';

/* jshint node: true */

var utils = require('utils');
var preprocessor = require('preprocessor');

var SystemAppBuilder = function() {
};

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

SystemAppBuilder.prototype.enableFirefoxSync = function(options) {
  var fileList = {
    process: [
      ['js', 'core.js'],
      ['js', 'fx_accounts_client.js']
    ],
    remove: [
      ['js', 'sync_manager.js'],
      ['js', 'sync_state_machine.js'],
      ['test', 'unit', 'sync_manager_test.js'],
      ['test', 'unit', 'sync_state_machine_test.js']
    ]
  };
  preprocessor.execute(options, 'FIREFOX_SYNC', fileList);
};

SystemAppBuilder.prototype.copyTvFolder = function(options) {
  var tvPath = options.APP_DIR.replace('apps', 'tv_apps');
  var smartSystemPath = tvPath.replace('system', '/smart-system');
  var stageSystemPath = options.STAGE_APP_DIR;
  var tvIndex = smartSystemPath + '/index.html';
  var tvNetError = smartSystemPath + '/net_error.html';
  var tvManifest = smartSystemPath + '/manifest.webapp';

  var foldersToCopy = [
    'js',
    'style',
    'fxa',
    'elements',
    'bower_components',
    'locales'
  ];

  foldersToCopy.forEach(function(current) {
    var folder = '/' + current;
    utils.copyDirTo(smartSystemPath + folder, stageSystemPath, current);
  });

  utils.copyFileTo(tvManifest, stageSystemPath, 'manifest.webapp');
  utils.copyFileTo(tvIndex, stageSystemPath, 'index.html');
  utils.copyFileTo(tvNetError, stageSystemPath, 'net_error.html');

  // Copy shared files from the new index.html
  var WebappShared = require('webapp-shared').WebappShared;
  var shared = new WebappShared();
  shared.setOptions({
    config: options,
    gaia: utils.gaia.getInstance(options),
    webapp: utils.getWebapp(options.APP_DIR, options)
  });
  shared.filterSharedUsage(utils.getFile(tvIndex));
  shared.filterSharedUsage(utils.getFile(tvNetError));
};

SystemAppBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  // TMP until we merge TV and phone system apps
  if (options.GAIA_DEVICE_TYPE === 'tv') {
    this.copyTvFolder(options);
  }
  this.setOptions(options);
  this.initConfigJsons();
  if (this.distDirPath) {
    this.addCustomizeFiles();
  }
  this.enableFirefoxSync(options);
  this.integrateLockScreen(options);
  this.integrateLockScreenInputpad(options);
  this.inlineDeviceType(options);
};

exports.execute = function(options) {
  (new SystemAppBuilder()).execute(options);
};
