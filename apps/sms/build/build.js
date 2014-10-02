/* global require, exports */

'use strict';

var utils = require('utils');

function removeDesktopOnlyFolder(appStageDir) {
  var desktopOnlyDir = utils.getFile(appStageDir, 'js', 'desktop-only');

  if (desktopOnlyDir.exists()) {
    desktopOnlyDir.remove(true);
  }
}

function removeDesktopOnlyScripts(appStageDir) {
  var indexFile = utils.getFile(appStageDir, 'index.html');
  var desktopOnlyScriptsRegex = /<script.+desktop\-only.+<\/script>/g;

  utils.writeContent(
    indexFile,
    utils.getFileContent(indexFile).replace(desktopOnlyScriptsRegex, '')
  );
}

exports.execute = function(options) {
  utils.copyToStage(options);

  removeDesktopOnlyFolder(options.STAGE_APP_DIR);
  removeDesktopOnlyScripts(options.STAGE_APP_DIR);
};
