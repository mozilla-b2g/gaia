'use strict';

/* global require, exports */
var utils = require('utils');

var SettingsAppBuilder = function(options) {
};

SettingsAppBuilder.prototype.RESOURCES_PATH = 'resources';

SettingsAppBuilder.prototype.writeSupportsJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources', 'support.json');
  var defaultContent = null;
  var content = utils.getDistributionFileContent('support',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.writeSensorsJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources', 'sensors.json');
  var defaultContent = { ambientLight: true };
  var content = utils.getDistributionFileContent('sensors',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.writeFindMyDeviceConfigJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR,
    'resources', 'findmydevice.json');
  var defaultContent = {
    api_url: 'https://find.firefox.com',
    api_version: '1',
  };

  var content = utils.getDistributionFileContent('findmydevice',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

/**
 * Override default search providers if customized version found in
 * in /customization/search
 *
 * Copies providers.json and icon files into resources/search
 */
SettingsAppBuilder.prototype.overrideSearchProviders = function(options) {
  var distDirPath = options.GAIA_DISTRIBUTION_DIR;
  if (!distDirPath) {
    return;
  }
  var appDirPath = options.APP_DIR;
  var searchDir = utils.getFile(appDirPath, this.RESOURCES_PATH, 'search');
  var distSearchDir = utils.getFile(distDirPath, 'search');
  if (!distSearchDir.exists() || !searchDir.exists()) {
    return;
  }
  var files = utils.ls(distSearchDir);
  files.forEach(function(file) {
    file.copyTo(searchDir, file.leafName);
  });
};

SettingsAppBuilder.prototype.execute = function(options) {
  this.writeSensorsJSON(options);
  this.writeSupportsJSON(options);
  this.writeFindMyDeviceConfigJSON(options);
  this.overrideSearchProviders(options);
};

exports.execute = function(options) {
  (new SettingsAppBuilder()).execute(options);
};
