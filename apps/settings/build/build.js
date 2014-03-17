'use strict';

/* global require, exports */
var utils = require('utils');

var SettingsAppBuilder = function(options) {
};

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

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources',
      'findmydevice.json');
  var defaultContent = {
    'api_url': 'http://ec2-54-241-87-238.us-west-1.compute.amazonaws.com',
    'api_version': '0'
  };

  var content = utils.getDistributionFileContent('findmydevice',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.execute = function(options) {
  this.writeSensorsJSON(options);
  this.writeSupportsJSON(options);
  this.writeFindMyDeviceConfigJSON(options);
};

exports.execute = function(options) {
  (new SettingsAppBuilder()).execute(options);
};
