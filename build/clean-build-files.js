'use strict';

/* global require, exports */

var utils = require('utils');

const REMOVED_FILES = ['Makefile', 'build', 'build.txt', 'test', 'README.md'];

exports.execute = function(options) {
  options.GAIA_APPDIRS.split(' ').forEach(function(appdirPath) {
    var appName = utils.getFile(appdirPath).leafName;
    var stageAppDir = utils.getFile(options.STAGE_DIR, appName);
    utils.removeFiles(stageAppDir, REMOVED_FILES);
  });
};
