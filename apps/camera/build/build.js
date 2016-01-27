'use strict';

/* jshint node: true */

var utils = require('../../build/utils');
var esomin = require('../../build/esomin');

function execute(options) {
  var appName = utils.basename(options.APP_DIR);
  var config = utils.getFile(options.APP_DIR, 'build',
    'require_config.jslike');

  var sandbox = utils.createSandbox();
  sandbox.arguments = [];
  sandbox.requirejsAsLib = true;
  sandbox.print = function() {
    if(options.VERBOSE === '1') {
      utils.log(appName, Array.prototype.join.call(arguments, ' '));
    }
  };
  utils.runScriptInSandbox(utils.getFile(
    options.GAIA_DIR, 'build', 'r.js'), sandbox);

  var optimize = 'optimize=none';
  var build = new Promise(function(resolve, reject) {
    sandbox.requirejs.optimize([config.path, optimize], resolve, reject);
  });

  return build.then(function() {
    utils.log(appName, 'require.js optimize done');
  })
  .then(function() {
    if (options.GAIA_OPTIMIZE === '1') {
      utils.log(appName, 'esomin minify done');
      return esomin.minifyDir(options.STAGE_APP_DIR);
    }
  })
  .catch(function(err) {
    utils.log(appName, 'running customize build failed');
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
  return execute(options);
};
