'use strict';

/* global exports, require, quit */

/**
 * this script is used to run test case for gaia build system.
 */

var utils = require('utils');

exports.execute = function(options) {
  const TEST_TYPE = utils.getEnv('TEST_TYPE');
  const REPORTER = utils.getEnv('REPORTER');
  const BUILD_TEST_MANIFEST = utils.getEnv('BUILD_TEST_MANIFEST');
  const TIMEOUT = '300000';

  var args = [
    '--harmony',
    '--reporter', REPORTER,
    '--ui', 'tdd',
    '--timeout', TIMEOUT
  ];

  // get blacklist from test manifest for build system.
  var blacklist = [];
  if (BUILD_TEST_MANIFEST) {
    // UNIX file separator is used in BUILD_TEST_MANIFEST, we should convert it
    // to a path array for Windows support.
    let manifest = utils.getFile(options.GAIA_DIR,
      ...BUILD_TEST_MANIFEST.split('/'));
    if (manifest.exists()) {
      let manifestContent = utils.getJSON(manifest);
      blacklist = manifestContent.blacklist.map(function(filePath) {
        // Same here, UNIX file separator is used in blacklist, convert it to
        // array here.
        var file = utils.getFile(options.GAIA_DIR, ...filePath.split('/'));
        if (!file.exists()) {
          // Throw error if the file in blacklist does not exist.
          throw new Error('file in blacklist not found: ' + file.path +
            ', manifest file: ' + manifest.path);
        }
        return file.path;
      });
    }
  }

  var testDir = utils.getFile(options.GAIA_DIR, 'build', 'test', TEST_TYPE);
  // Sort test files to ensure the order of files will be the same everytime.
  utils.ls(testDir, false, /\.test\.js$/, true).sort(function(a, b) {
    return (a.path < b.path) ? -1 : 1;
  }).forEach(function(file) {
    // Ignore a file if it appears in blacklist
    if (blacklist.indexOf(file.path) === -1) {
      args.push(file.path);
    }
  });

  // Use Mocha to run test cases.
  var cwd = utils.getFile(options.GAIA_DIR, 'node_modules', '.bin').path;
  var cmd = new utils.Commander('mocha');
  cmd.initPath(cwd);
  cmd.run(args, function(exitValue) {
    quit(exitValue);
  });
};
