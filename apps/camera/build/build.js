'use strict';

/* global exports, require */

var utils = require('utils');

function optimize(options) {
  var r = require('r-wrapper').get(options.GAIA_DIR);
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'require_config.jslike');
  var optimizeOption = 'optimize=' + (options.GAIA_OPTIMIZE === '1' ?
    'uglify2' : 'none');
  r.optimize([configFile.path, optimizeOption]);
}

function copyUserConfig(options) {
  var targetFile = utils.getFile(options.STAGE_APP_DIR, 'js', 'config',
    'config.js');
  var [parent, filename] = [targetFile.parent.path, targetFile.leafName];

  if (options.GAIA_DISTRIBUTION_DIR) {
    var distConfig = utils.getFile(options.GAIA_DISTRIBUTION_DIR,
      'camera-config.js');
    if (distConfig.exists()) {
      utils.copyFileTo(distConfig, parent, filename);
    }
  }
}

exports.execute = function(options) {
  copyUserConfig(options);
  optimize(options);
};
