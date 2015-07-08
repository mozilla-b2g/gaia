'use strict';

/**
 * Overview:
 *
 * 1. Find all '.js' files in the app directory
 * 2. Replace the path with the '.esp.js' one
 * 3. Check if such file exists
 * 4. Run this transformer + espect to apply the esp file on to target file
 */
var utils = require('utils');

exports.execute = function(options, webapp) {
  var debuguypath = options.RAPTOR_TRANSFORMER_PATH;
  if (!debuguypath) {
    debuguypath = options.GAIA_DIR + '/node_modules/debuguy';
  }

  var file = utils.getFile(debuguypath);
  if (!file.exists()) {
    throw new Error('Cannot find debuguy: set the path of tool as DEBUGUY');
  }
  var debuguyclipath = debuguypath + '/cli.js';

  var node = new utils.Commander('node');
  node.initPath(utils.getEnvPath());
  node.run([debuguyclipath, 'autolog', '--x-espect=' +
    options.GAIA_DIR + '/build/raptor-test-transformer.esp.js' , '--r',
    webapp.buildDirectoryFilePath]);
};
