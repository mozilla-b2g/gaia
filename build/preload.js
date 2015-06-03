'use strict';

var utils = require('./utils');
var python = new utils.Commander('python');

exports.execute = function(opts) {
  var GAIA_DISTRIBUTION_DIR = utils.getEnv('GAIA_DISTRIBUTION_DIR');
  var GAIA_DIR = utils.getEnv('GAIA_DIR');
  var remoteList;
  try {
    remoteList = utils.getFile(GAIA_DISTRIBUTION_DIR, 'remote.list');
  } catch(e) {}

  if (!remoteList || !remoteList.exists()) {
    return;
  }

  var appFolder = utils.getFile(GAIA_DISTRIBUTION_DIR, 'outoftree_apps/');
  utils.deleteFile(appFolder.path, true);
  utils.ensureFolderExists(appFolder);

  utils.copyFileTo(remoteList, appFolder.path, 'list');

  var preload = utils.getFile(GAIA_DIR, 'tools/preload.py').path;

  python.initPath(utils.getEnvPath());
  return python.run([preload, '--root=' + appFolder.path]);
};
