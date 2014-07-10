'use strict';

/* global exports, require */

var utils = require('utils');

function optimize(options) {
  var r = require('r-wrapper').get(options.GAIA_DIR);
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'require_config.jslike');
  r.optimize([configFile.path]);
}

function copyUserConfig(options) {
  var targetFile = utils.getFile(options.STAGE_APP_DIR, 'js', 'config',
    'config.js');

  if (options.GAIA_DISTRIBUTION_DIR) {
    var distConfig = utils.getFile(options.GAIA_DISTRIBUTION_DIR,
      'camera-config.js');
    if (distConfig.exists()) {
      if (targetFile.exists()) {
        targetFile.remove(false);
      }
      distConfig.copyTo(targetFile.parent, targetFile.leafName);
    }
  }
}

exports.execute = function(options) {
  copyUserConfig(options);
  optimize(options);
};
