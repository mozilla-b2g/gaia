'use strict';

var utils = require('./utils');

function remove(stageDir, appName) {
  var stageAppDir = utils.getFile(stageDir, appName);
  if (stageAppDir.exists()) {
    stageAppDir.remove(true);
  }
}

exports.execute = function(options) {
  if (options.BUILD_APP_NAME !== '*') {
    remove(options.STAGE_DIR, options.BUILD_APP_NAME);
    return;
  }

  options.GAIA_APPDIRS.split(' ').forEach(function(appdirPath) {
    try {
      var appName = utils.getFile(appdirPath).leafName;
      remove(options.STAGE_DIR, appName);
    } catch (e) {
      // getFile will raise an exception if initial nsIFile with first argument
      // doesn't exist, add an empty exception handler to catch it.
    }
  });
};
