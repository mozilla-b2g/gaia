'use strict';

/* global exports, require */

var utils = require('utils');

function optimize(options) {
  var r = require('r-wrapper').get(options.GAIA_DIR);
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'require_config.jslike');
  r.optimize([configFile.path]);
}

function copyConfigFile(options) {
  var targetFile = utils.getFile(options.STAGE_APP_DIR, 'js', 'config',
    'config.js');
  var [parent, filename] = [targetFile.parent.path, targetFile.leafName];
  var configFile = utils.getFile(options.APP_DIR,
      'config-default.js');

  if (options.DEVICE_TIER === 'low') {
    configFile = utils.getFile(options.APP_DIR,
      'config-lowend.js');
  }

  if (options.GAIA_DISTRIBUTION_DIR) {
    configFile = utils.getFile(options.GAIA_DISTRIBUTION_DIR,
      'camera-config.js');
  }

  utils.copyFileTo(configFile, parent, filename, true);
}

exports.execute = function(options) {
  copyConfigFile(options);
  optimize(options);
};
