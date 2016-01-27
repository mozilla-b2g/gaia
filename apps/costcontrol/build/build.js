'use strict';

/* jshint node: true */

var utils = require('utils');

function removeDesktopOnlyFolder(appStageDir) {
  var desktopOnlyDir = utils.getFile(appStageDir, 'js', 'desktop-only');

  if (desktopOnlyDir.exists()) {
    desktopOnlyDir.remove(true);
  }
}

function removeDesktopOnlyScripts(appStageDir) {
  var desktopOnlyScriptsRegex = /<script.+desktop\-only.+<\/script>/g;
  var filesToProcess = [
    'index.html',
    'fte.html',
    'message_handler.html',
    'settings.html'
  ];

  filesToProcess.forEach(function(fileName) {
    var file = utils.getFile(appStageDir, fileName);
    utils.writeContent(
      file,
      utils.getFileContent(file).replace(desktopOnlyScriptsRegex, '')
    );
  });
}

exports.execute = function(options) {
  utils.copyToStage(options);

  removeDesktopOnlyFolder(options.STAGE_APP_DIR);
  removeDesktopOnlyScripts(options.STAGE_APP_DIR);
};
