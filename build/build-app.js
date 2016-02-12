'use strict';

var utils = require('./utils');
var nodeHelper = new utils.NodeHelper();

exports.execute = function(options) {
  var webapp = utils.getWebapp(options.APP_DIR, options);
  var appDir = utils.getFile(webapp.appDirPath);
  options.webapp = webapp;

  var nodeScripts = [
    'bluetooth',
    'calendar',
    'camera',
    'clock',
    'communications',
    'costcontrol',
    'email',
    'findmydevice',
    'ftu',
    'gallery',
    'homescreen',
    'keyboard',
    'music',
    'operatorvariant',
    'search',
    'settings',
    'sms',
    'system',
    'verticalhome',
    'wallpaper',
    'wappush',
    'music-oga',
    'browser',
    'smart-system'
  ];
  var appName = appDir.leafName;
  if (options.RUN_ON_NODE === '1' && nodeScripts.indexOf(appName) !== -1) {
    var buildDir = utils.joinPath(options.GAIA_DIR, 'build');
    var appBuildScriptPath = utils.joinPath(appDir.path, 'build/build');
    var requirePath = utils.relativePath(buildDir, appBuildScriptPath);
    nodeHelper.require(requirePath, options);
  } else {
    require(appDir.leafName + '/build').execute(options);
  }

  // Wait for all app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  nodeHelper.require('./post-app', options);
};
