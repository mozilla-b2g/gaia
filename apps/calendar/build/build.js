'use strict';

/* jshint node: true */

var utils = require('../../build/utils');

function createPresetsFile(options) {
  var presetsFile = utils.getFile(options.APP_DIR, 'js/common', 'presets.js');

  var config = JSON.parse(
    utils.getFileContent(
      utils.getFile(options.APP_DIR, 'build', 'config.json')
    )
  );

  var presets = utils.getDistributionFileContent(
    'calendar',
    config,
    options.GAIA_DISTRIBUTION_DIR
  );

  utils.writeContent(presetsFile, 'define(' + presets + ');');
}

exports.execute = function(options) {
  var appName = utils.basename(options.APP_DIR);
  var config = utils.getFile(options.APP_DIR, 'build', 'calendar.build.js');

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

  createPresetsFile(options);
  utils.ensureFolderExists(utils.getFile(options.STAGE_APP_DIR));

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
