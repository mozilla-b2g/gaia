'use strict';

/* global require, exports */

var utils = require('utils');

const REMOVED_FILES = ['Makefile', 'build', 'build.txt', 'test', 'README.md'];

exports.execute = function(options) {
  var app = utils.getFile(options.APP_DIR);
  var stageAppDir = utils.getFile(options.STAGE_DIR, app.leafName);
  utils.removeFiles(stageAppDir, REMOVED_FILES);
};
