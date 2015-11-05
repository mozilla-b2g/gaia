'use strict';

/* global exports, require */

var utils = require('utils');
var esomin = require('esomin');

function optimize(options) {
  var r = require('r-wrapper').get(options.GAIA_DIR);
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'require_config.jslike');
  var ropt = new Promise(function(resolve, reject) {
    r.optimize([configFile.path, 'optimize=none'], resolve, reject);
  });
  return ropt.then(function() {
    if (options.GAIA_OPTIMIZE === '1') {
      utils.log('camera', 'Using esomin to minify');
      return esomin.minifyDir(options.STAGE_APP_DIR);
    }
  }).catch(function (err) {
    utils.log(err);
    utils.log(err.stack);
    throw err;
  });
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
  return optimize(options);
};
