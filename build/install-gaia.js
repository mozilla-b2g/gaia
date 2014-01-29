'use strict';

var utils = require('./utils');
var sh = new utils.Commander('sh');
var Q = utils.Q;

sh.initPath(utils.getEnvPath());

function installGaia(profileFolder, remotePath) {
  // MingGW on Windows takes '/remote/src' as 'c:\remote\src' which is
  // not right, so we use two slash before the remote path to prevent it.
  var webapps_path = '/' + remotePath + '/webapps';

  var indexedDbFile;
  var queue = Q.defer();
  queue.resolve();

  return queue.promise.then(function() {
    return sh.run(['-c', 'adb shell rm -r ' + webapps_path]);
  }).then(function() {
    return sh.run(['-c', 'adb shell rm //data/local/user.js']);
  }).then(function() {
    // adb push /gaia/profile/webapps /system/b2g/webapps
    return sh.run(['-c', 'adb push "' + utils.joinPath(profileFolder,
                  'webapps') + '" ' + webapps_path]);
  }).then(function() {
    // adb push /gaia/profile/user.js /data/local/user.js
    return sh.run(['-c', 'adb push "' + utils.joinPath(profileFolder,
                  'user.js') + '" //data/local/user.js']);
  }).then(function() {
    indexedDbFile = utils.getFile(profileFolder, 'indexedDB');
  }).then(function() {
    if (indexedDbFile.exists() && indexedDbFile.isDirectory()) {
      // adb push /gaia/profile/indexedDB /data/local/indexedDB
      return sh.run(['-c', 'adb push "' + indexedDbFile.path +
        '" //data/local/indexedDB']);
    }
  });
}

function installSvoperapps(profileFolder) {
  var svoperappsUrl = '//data/local/svoperapps';
  var queue = Q.defer();
  queue.resolve();
  return queue.promise.then(function() {
    return sh.run(['-c', 'adb shell rm -r ' + svoperappsUrl]);
  }).then(function() {
    return sh.run(['-c', 'adb push "' + utils.joinPath(profileFolder,
      'svoperapps') + '" ' + svoperappsUrl]);
  });
}

function installOneApp(targetFolder, buildAppName, remotePath, gaiaDomain) {
  var queue = Q.defer();
  queue.resolve();
  return queue.promise.then(function() {
    // "adb push /gaia/profile/webapps/SOME_APP.gaiamobile.org/manifest.webapp
    //  /system/b2g/webapps/SOME_APP.gaiamobile.org/manifest.webapp"
    return sh.run(['-c',
      'adb push "' + utils.joinPath(targetFolder, 'manifest.webapp') +
      '" /' + remotePath + '/webapps/' + buildAppName + '.' +
      gaiaDomain + '/manifest.webapp']);
  }).then(function() {
    // adb push /gaia/profile/webapps/SOME_APP.gaiamobile.org/application.zip
    //  /system/b2g/webapps/SOME_APP.gaiamobile.org/application.zip"
    return sh.run(['-c',
      'adb push "' + utils.joinPath(targetFolder, 'application.zip') +
      '" /' + remotePath + '/webapps/' + buildAppName + '.' +
      gaiaDomain + '/application.zip']);
  });
}

function execute(options) {
  const buildAppName = options.BUILD_APP_NAME;
  const gaiaDir = options.GAIA_DIR;
  const profileFolder = options.PROFILE_DIR;
  const gaiaDomain = options.GAIA_DOMAIN;
  const remotePath = options.GAIA_INSTALL_PARENT || '/system/b2g';

  var mainQ = Q.defer();
  var targetFolder;

  mainQ.resolve();
  return mainQ.promise.then(function() {
    return sh.run(['-c', 'adb start-server']);
  }).then(function() {
    var profile = utils.getFile(profileFolder);
    if (!profile.isDirectory()) {
      throw new Error(' -*- build/install-gaia.js: cannot locate' +
                      'profile folder in ' + options.PROFILE_DIR);
    }
  }).then(function() {
    if (buildAppName === '*' || buildAppName === 'system') {
      return sh.run(['-c', 'adb shell stop b2g']);
    }
  }).then(function() {
    return sh.run(['-c', 'adb shell rm -r //cache/*']);
  }).then(function() {
    if (buildAppName === '*') {
      return installGaia(profileFolder, remotePath);
    } else {
      targetFolder = utils.joinPath(
          profileFolder, 'webapps',
          buildAppName + '.' + gaiaDomain);
      return installOneApp(targetFolder, buildAppName, remotePath, gaiaDomain);
    }
  }).then(function() {
    if (options.VARIANT_PATH) {
      return installSvoperapps(profileFolder);
    }
  }).then(function() {
    if (buildAppName === '*' || buildAppName === 'system') {
      sh.run(['-c', 'adb shell start b2g']);
    } else {
      var Q3 = Q.defer();
      var manifest;
      var appPid;
      Q3.resolve();
      return Q3.promise.then(function() {
      // Some app folder name is different with the process name,
      // ex. sms -> Messages
        manifest = utils.readZipManifest(utils.getFile(
                        targetFolder));
      }).then(function() {
        utils.killAppByPid(manifest.name, gaiaDir);
      });
    }
  });
}

exports.execute = execute;
exports.installSvoperapps = installSvoperapps;
exports.installGaia = installGaia;
