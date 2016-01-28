'use strict';

/**
 * This script is used to run test case for gaia build system.
 */

var utils = require('./utils');
var Mocha = require('mocha');

exports.execute = function(options) {
  var TEST_TYPE = utils.getEnv('TEST_TYPE');
  var REPORTER = utils.getEnv('REPORTER');
  var TRY_ENV = utils.getEnv('TRY_ENV');
  var TEST_FILES = utils.getEnv('TEST_FILES');
  var TIMEOUT = '600000';
  var BUILD_TEST_PATH = 'build/test/';
  var thisChunk = utils.getEnv('THIS_CHUNK') || 1;
  var totalChunks = utils.getEnv('TOTAL_CHUNKS') || 1;

  var mocha = new Mocha({
    ui: 'tdd',
    reporter: REPORTER,
    timeout: TIMEOUT
  });

  // Specify build test libraries path for build script testing
  utils.setEnv('NODE_PATH', '$NODE_PATH:' + BUILD_TEST_PATH + TEST_TYPE);

  if (TRY_ENV === '1') {
    // Pass MOZ_DISABLE_NONLOCAL_CONNECTIONS=1 to try server in order to fail
    // testing if there are network connections.
    utils.setEnv('MOZ_DISABLE_NONLOCAL_CONNECTIONS', '1');
    // Exclude tests if mocha test description marks [Network Required]
    mocha.grep(/\[Network Required\]/).invert();
  }

  var testDir = utils.getFile(options.GAIA_DIR);
  var files = [];
  var pattern;

  if (TEST_FILES) {
    pattern = new RegExp(TEST_FILES.trim().replace(' ', '|'));
  } else {
    pattern = new RegExp('^' + options.GAIA_DIR +
      '(/build/test/|/apps/\\S+/test/build/)' + TEST_TYPE + '/\\S+_test\\.js$');
  }

  utils.ls(testDir, true).forEach(function(file) {
    if (pattern.test(file.path)) {
      files.push(file.path);
    }
  });

  // Sort test files to ensure the order of files will be the same everytime.
  files = files.sort();

  // Calculate chunks for task cluster to split tests
  if (files.length >= totalChunks) {
    let chunkLength = parseInt(Math.ceil(files.length / totalChunks));
    let chunk = parseInt((thisChunk - 1) * chunkLength);
    files = files.slice(chunk, chunk + chunkLength);
  }

  // Use Mocha to run test cases.
  files.forEach(mocha.addFile, mocha);
  mocha.run(utils.exit);
};
