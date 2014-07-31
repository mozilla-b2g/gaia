'use strict';

/* global require, exports */

var utils = require('utils');

const REMOVED_FILES = ['Makefile', 'build', 'build.txt', 'test', 'README.md'];

exports.execute = function(options) {
  options.GAIA_APPDIRS.split(' ').forEach(function(appdirPath) {
    var appName = utils.getFile(appdirPath).leafName;
    var stageAppDir = utils.getFile(options.STAGE_DIR, appName);

    try {
      utils.removeFiles(stageAppDir, REMOVED_FILES);
    } catch (e) {
      // sometime nsIFile.remove() throw exception even file exists, this bug
      // only happend on Windows but it just clean redundant files in
      // build_stage, so we can skip this exception and show warning message
      // here. see bug 1046514 for more details.
      var log = 'directories/files cannot be removed.\n' +
        '  directory: ' + stageAppDir.path + '\n' +
        '  files: ' + JSON.stringify(REMOVED_FILES);
      utils.log('clean-build-files', log);
    }
  });
};
