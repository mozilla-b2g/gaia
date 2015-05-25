'use strict';

var utils = require('./utils');
var python = new utils.Commander('python');

python.initPath(utils.getEnvPath());

exports.execute = function(opts) {

  dump('EXECUTING\n');
  var remoteList;
  try {
    remoteList = utils.getFile(opts.GAIA_DISTRIBUTION_DIR, 'remote.list');
  } catch(e) {}

  if (!remoteList || !remoteList.exists()) {
    return;
  }

  dump('PROBABLY SHOULDNT BE HERE?' + remoteList.path + '\n');

  // var appFolder = utils.getFile(opts.GAIA_DISTRIBUTION_DIR, 'outoftree_apps/');
  // utils.deleteFile(appFolder.path, true);
  // utils.ensureFolderExists(appFolder);

  // utils.copyFileTo(remoteList, appFolder.path, 'list');

  // var preload = utils.getFile(opts.GAIA_DIR, 'tools/preload.py').path;
  // return python.run([preload, '--root=' + appFolder.path]);
};
