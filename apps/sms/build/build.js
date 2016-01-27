'use strict';

/* jshint node: true */

var utils = require('utils');

function removeDesktopOnlyFolder(appStageDir) {
  var desktopOnlyDir = utils.getFile(appStageDir, 'desktop-mock');

  if (desktopOnlyDir.exists()) {
    desktopOnlyDir.remove(true);
  }
}

function removeDesktopOnlyScripts(appStageDir) {
  // Picking every file specifically since we may have "index.html" files from
  // a bunch of places we don't want process to (shared, node modules, bower..).
  [
    'index.html',
    'views/inbox/index.html',
    'views/conversation/index.html',
    'views/shared/shim_host.html'
  ].forEach((indexFilePath) => {
    var indexFile = utils.getFile(appStageDir, indexFilePath);
    var indexDocument = utils.getDocument(utils.getFileContent(indexFile));

    var mockScripts = indexDocument.querySelectorAll(
      'script[src*="desktop-mock"]'
    );

    for (var mockScript of mockScripts) {
      mockScript.parentNode.removeChild(mockScript);
    }

    utils.writeContent(indexFile, utils.serializeDocument(indexDocument));
  });
}

function prepareBridgeLibs(options) {
  var bridgeLibsPath = utils.joinPath(options.STAGE_APP_DIR, 'lib/bridge');

  ['service.min.js', 'client.min.js'].forEach(function(optimizedLib) {
    var optimizedLibPath = utils.joinPath(bridgeLibsPath, optimizedLib);

    // If we want to have only optimized libs, let's replace non-optimized
    // version with optimized one.
    if (options.GAIA_OPTIMIZE === '1') {
      utils.copyFileTo(
        optimizedLibPath, bridgeLibsPath, optimizedLib.replace('.min', '')
      );
    }

    utils.deleteFile(optimizedLibPath);
  });
}

exports.execute = function(options) {
  utils.copyToStage(options);

  prepareBridgeLibs(options);

  removeDesktopOnlyFolder(options.STAGE_APP_DIR);
  removeDesktopOnlyScripts(options.STAGE_APP_DIR);
};
