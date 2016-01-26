'use strict';

/* jshint node: true */

var utils = require('../../build/utils');

exports.execute = function(options) {
  var appName = utils.basename(options.APP_DIR);
  var stageAppDir = utils.getFile(options.STAGE_APP_DIR);
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

  utils.ensureFolderExists(stageAppDir);

  var optimize = 'optimize=none';
  var build = new Promise(function(resolve, reject) {
    sandbox.requirejs.optimize([config.path, optimize], resolve, reject);
  });

  return build.then(function() {
    utils.log(appName, 'require.js optimize done');
  }).catch(function(err) {
    utils.log(appName, 'require.js optimize failed');
    throw err;
  });
};
