'use strict';

/* global require, exports */

var utils = require('./utils');
var sh = new utils.Commander('sh');
var Q = utils.Q;

sh.initPath(utils.getEnvPath());

function pushToDevice(profileFolder, remotePath, adb) {
  // MingGW on Windows takes '/remote/src' as 'c:\remote\src' which is
  // not right, so we use two slash before the remote path to prevent it.
  var webapps_path = '/' + remotePath + '/webapps';

  var indexedDbFile;
  var queue = Q.defer();
  queue.resolve();

  return queue.promise.then(function() {
    return sh.run(['-c', adb + ' shell rm -r ' + webapps_path]);
  }).then(function() {
    return sh.run(['-c', adb + ' shell rm //data/local/user.js']);
  }).then(function() {
    // adb push /gaia/profile/webapps /system/b2g/webapps
    return sh.run(['-c', adb + ' push "' + utils.joinPath(profileFolder,
                  'webapps') + '" ' + webapps_path]);
  }).then(function() {
    // adb push /gaia/profile/user.js /data/local/user.js
    return sh.run(['-c', adb + ' push "' + utils.joinPath(profileFolder,
                  'user.js') + '" //data/local/user.js']);
  }).then(function() {
    indexedDbFile = utils.getFile(profileFolder, 'indexedDB');
  }).then(function() {
    if (indexedDbFile.exists() && indexedDbFile.isDirectory()) {
      // adb push /gaia/profile/indexedDB /data/local/indexedDB
      return sh.run(['-c', adb + ' push "' + indexedDbFile.path +
        '" //data/local/indexedDB']);
    }
  });
}

function installSvoperapps(profileFolder, adb) {
  var svoperappsUrl = '//data/local/svoperapps';
  var queue = Q.defer();
  queue.resolve();
  return queue.promise.then(function() {
    return sh.run(['-c', adb + ' shell rm -r ' + svoperappsUrl]);
  }).then(function() {
    return sh.run(['-c', adb + ' push "' + utils.joinPath(profileFolder,
      'svoperapps') + '" ' + svoperappsUrl]);
  });
}

function installOneApp(targetFolder, buildAppName,
                       remotePath, gaiaDomain,
                       adb) {
  var queue = Q.defer();
  queue.resolve();
  return queue.promise.then(function() {
    // "adb push /gaia/profile/webapps/SOME_APP.gaiamobile.org/manifest.webapp
    //  /system/b2g/webapps/SOME_APP.gaiamobile.org/manifest.webapp"
    return sh.run(['-c',
      adb + ' push "' + utils.joinPath(targetFolder, 'manifest.webapp') +
      '" /' + remotePath + '/webapps/' + buildAppName + '.' +
      gaiaDomain + '/manifest.webapp']);
  }).then(function() {
    // adb push /gaia/profile/webapps/SOME_APP.gaiamobile.org/application.zip
    //  /system/b2g/webapps/SOME_APP.gaiamobile.org/application.zip"
    return sh.run(['-c',
      adb + ' push "' + utils.joinPath(targetFolder, 'application.zip') +
      '" /' + remotePath + '/webapps/' + buildAppName + '.' +
      gaiaDomain + '/application.zip']);
  });
}

function getRemoteInstallPath(adb) {
  var tempDirName = 'pushGaia' + Math.random().toString(36).substr(2, 8);
  var tempDir = utils.getTempFolder(tempDirName);
  var tempFile = tempDir.clone();
  var content;
  tempFile.append('webapps.json');

  // Use |adb shell cat| instead of |adb pull| so we don't run into
  // error and exit when the file does not exist.
  sh.run(['-c', adb + ' shell cat /data/local/webapps/webapps.json > ' +
    tempFile.path]);

  // Read the file as JSON
  // If there were no webapps ever installed on the device (likely purged in
  // the previous step), default to /system/b2g
  try {
    content = utils.getJSON(tempFile);
  } catch (e) {
    return '/system/b2g';
  }
  // Remove the entire temp directory
  tempDir.remove(true);

  // If any of the preload Gaia app was installed at /system/b2g,
  // we should overwrite them in /system/b2g
  for (var app in content) {
    if (content[app].basePath === '/system/b2g/webapps') {
      return '/system/b2g';
    }
  }
  return '/data/local';
}

function execute(options) {
  const buildAppName = options.BUILD_APP_NAME;
  const gaiaDir = options.GAIA_DIR;
  const profileFolder = options.PROFILE_DIR;
  const gaiaDomain = options.GAIA_DOMAIN;
  var remotePath = options.GAIA_INSTALL_PARENT;
  var pid;
  var manifest;
  var restartB2g = true;

  var mainQ = Q.defer();
  var targetFolder;

  var adb = options.ADB;

  if (buildAppName !== '*') {
    targetFolder = utils.joinPath(
        profileFolder, 'webapps',
        buildAppName + '.' + gaiaDomain);
    // Some app folder name is different with the process name,
    // ex. sms -> Messages
    manifest = utils.readZipManifest(utils.getFile(targetFolder));
    pid = utils.getPid(manifest.name, gaiaDir);

    // don't restart b2g process if we found pid by app name
    restartB2g = (pid === -1);
  }

  mainQ.resolve();
  return mainQ.promise.then(function() {
    var profile = utils.getFile(profileFolder);
    if (!profile.isDirectory()) {
      throw new Error(' -*- build/push-to-device.js: cannot locate' +
                      'profile folder in ' + options.PROFILE_DIR);
    }
  }).then(function() {
    return sh.run(['-c', adb + ' start-server']);
  }).then(function() {
    utils.log('push', 'Waiting for device ...');
    return sh.run(['-c', adb + ' wait-for-device']);
  }).then(function() {
    if (restartB2g) {
      return sh.run(['-c', adb + ' shell stop b2g']);
    }
  }).then(function() {
    return sh.run(['-c', adb + ' shell rm -r //cache/*']);
  }).then(function() {
    if (!remotePath) {
      utils.log('push', 'GAIA_INSTALL_PARENT unset; ' +
        'probing previous installation location...');
      remotePath = getRemoteInstallPath(adb);
    }
    utils.log('push', 'Install webapp(s) to ' + remotePath + '...');

    if (/^\/system\//.test(remotePath)) {
      return sh.run(['-c', adb + ' remount']);
    }
  }).then(function() {
    if (buildAppName === '*') {
      return pushToDevice(profileFolder, remotePath, adb);
    } else {
      return installOneApp(targetFolder, buildAppName,
                           remotePath, gaiaDomain, adb);
    }
  }).then(function() {
    if (options.VARIANT_PATH) {
      return installSvoperapps(profileFolder, adb);
    }
  }).then(function() {
    if (restartB2g) {
      utils.log('push', 'Restarting B2G...');
      sh.run(['-c', adb + ' shell start b2g']);
    } else {
      var Q3 = Q.defer();
      Q3.resolve();
      return Q3.promise.then(function() {
        utils.log('push', 'Restarting ' + manifest.name + '...');
        utils.killAppByPid(pid);
      });
    }
  });
}

exports.execute = execute;
exports.installSvoperapps = installSvoperapps;
exports.getRemoteInstallPath = getRemoteInstallPath;
exports.pushToDevice = pushToDevice;
