'use strict';

var utils = require('./utils');
var sh = new utils.Commander('sh');

const JOB_NAME = 'push-to-device';

sh.initPath(utils.getEnvPath());

/**
 * detect if b2g process needs to be restarted
 * @param  {string}  appName app name
 * @return {bool}            true if needed
 */
function needsB2gRestart(appName) {
  // b2g should be restarted if these app name is assigned by APP=appname
  var appList = ['system'];
  return (appList.indexOf(appName) !== -1);
}

function pushToDevice(profileFolder, remotePath, adb) {
  // MingGW on Windows takes '/remote/src' as 'c:\remote\src' which is
  // not right, so we use two slash before the remote path to prevent it.
  var webapps_path = '/' + remotePath + '/webapps';
  return Promise.resolve()
    .then(function() {
      return sh.run(['-c', adb + ' shell rm -r ' + webapps_path]);
    })
    .then(function() {
      return sh.run(['-c', adb + ' shell rm //data/local/user.js']);
    })
    .then(function() {
      // adb push /gaia/profile/webapps /system/b2g/webapps
      return sh.run(['-c', adb + ' push "' + utils.joinPath(profileFolder,
                    'webapps') + '" ' + webapps_path]);
    })
    .then(function() {
      // adb push /gaia/profile/user.js /data/local/user.js
      return sh.run(['-c', adb + ' push "' + utils.joinPath(profileFolder,
                    'user.js') + '" //data/local/user.js']);
    })
    .then(function() {
      var indexedDbFile = utils.getFile(profileFolder, 'indexedDB');
      if (indexedDbFile.exists() && indexedDbFile.isDirectory()) {
        // adb push /gaia/profile/indexedDB /data/local/indexedDB
        return sh.run(['-c', adb + ' push "' + indexedDbFile.path +
          '" //data/local/indexedDB']);
      }
    });
}

function installSvoperapps(profileFolder, adb) {
  var svoperappsUrl = '//data/local/svoperapps';

  return Promise.resolve()
    .then(function() {
      return sh.run(['-c', adb + ' shell rm -r ' + svoperappsUrl]);
    })
    .then(function() {
      return sh.run(['-c', adb + ' push "' + utils.joinPath(profileFolder,
        'svoperapps') + '" ' + svoperappsUrl]);
    });
}

function installOneApp(targetFolder, buildAppName,
                       remotePath, gaiaDomain,
                       adb) {
  // Instead of push to remote path directly, we push to temp folder and then
  // cat to overwrite the file. This way the original file will not be deleted
  // and reading from the already opened fd will get updated content. So even we
  // can't clear the zip cache, will still have updated app launched next time.
  return Promise.resolve()
    .then(function() {
      // "adb push /gaia/profile/webapps/SOME_APP.gaiamobile.org/manifest.webapp
      // /data/local/tmp/pushgaia/SOME_APP.gaiamobile.org/manifest.webapp"
      return sh.run(['-c',
        adb + ' push "' + utils.joinPath(targetFolder, 'manifest.webapp') +
        '" //data/local/tmp/pushgaia/' + buildAppName + '.' + gaiaDomain +
        '/manifest.webapp']);
    })
    .then(function() {
      // "adb push /gaia/profile/webapps/SOME_APP.gaiamobile.org/application.zip
      //  /data/local/tmp/pushgaia/SOME_APP.gaiamobile.org/application.zip"
      return sh.run(['-c',
        adb + ' push "' + utils.joinPath(targetFolder, 'application.zip') +
        '" //data/local/tmp/pushgaia/' + buildAppName + '.' + gaiaDomain +
        '/application.zip']);
    })
    .then(function() {
      // "adb shell cat /data/local/tmp/pushgaia/SOME_APP.gaiamobile.org/manifes
      // t.webapp > /system/b2g/webapps/SOME_APP.gaiamobile.org/manifest.webapp"
      return sh.run(['-c',
        adb + ' shell "cat /data/local/tmp/pushgaia/' + buildAppName +
        '.' + gaiaDomain + '/manifest.webapp > ' + remotePath + '/webapps/' +
        buildAppName + '.' + gaiaDomain + '/manifest.webapp"']);
    })
    .then(function() {
      // "adb shell cat /data/local/tmp/pushgaia/SOME_APP.gaiamobile.org/applica
      // tion.zip > /system/b2g/webapps/SOME_APP.gaiamobile.org/application.zip"
      return sh.run(['-c',
        adb + ' shell "cat /data/local/tmp/pushgaia/' + buildAppName +
        '.' + gaiaDomain + '/application.zip > ' + remotePath + '/webapps/' +
        buildAppName + '.' + gaiaDomain + '/application.zip"']);
    })
    .then(function() {
      // "adb shell rm -rf /data/local/tmp/pushgaia"
      return sh.run(['-c', adb + ' shell rm -rf //data/local/tmp/pushgaia']);
    });
}

function getRemoteInstallPath(adb) {
  var tempDirName = 'pushGaia' + Math.random().toString(36).substr(2, 8);
  var tempDir = utils.getTempFolder(tempDirName);
  var tempFile = utils.getFile(tempDir.path, 'webapps.json');

  // Use |adb shell cat| instead of |adb pull| so we don't run into
  // error and exit when the file does not exist.
  sh.run(['-c', adb + ' shell cat /data/local/webapps/webapps.json > ' +
    tempFile.path]);

  // Read the file as JSON
  // If there were no webapps ever installed on the device (likely purged in
  // the previous step), default to /system/b2g
  var content;
  try {
    content = utils.getJSON(tempFile);
  } catch (e) {
    return '/system/b2g';
  }

  // Remove the entire temp directory
  utils.deleteFile(tempDir.path);

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
  var targetFolder;
  var adb = options.ADB;
  var restartB2g = needsB2gRestart(buildAppName);

  if (restartB2g) {
    utils.log(JOB_NAME, 'b2g process will be restarted for ' +
      'installing ' + buildAppName + ' app, see bug 1000049 for ' +
      'more information.');
  }

  return Promise.resolve()
    .then(function() {
      var profile = utils.getFile(profileFolder);
      if (!profile.isDirectory()) {
        throw new Error(' -*- build/push-to-device.js: cannot locate' +
                        'profile folder in ' + options.PROFILE_DIR);
      }
    })
    .then(function() {
      return sh.run(['-c', adb + ' start-server']);
    })
    .then(function() {
      utils.log(JOB_NAME, 'Waiting for device ...');
      return sh.run(['-c', adb + ' wait-for-device']);
    })
    .then(function() {
      if (buildAppName === '*' || restartB2g) {
        return sh.run(['-c', adb + ' shell stop b2g']);
      }
    })
    .then(function() {
      return sh.run(['-c', adb + ' shell rm -r //cache/*']);
    })
    .then(function() {
      if (!remotePath) {
        utils.log(JOB_NAME, 'GAIA_INSTALL_PARENT unset; ' +
          'probing previous installation location...');
        remotePath = getRemoteInstallPath(adb);
      }
      utils.log(JOB_NAME, 'Install webapp(s) to ' + remotePath + '...');

      if (/^\/system\//.test(remotePath)) {
        return sh.run(['-c', adb + ' remount']);
      }
    })
    .then(function() {
      if (buildAppName === '*') {
        return pushToDevice(profileFolder, remotePath, adb);
      } else {
        targetFolder = utils.joinPath(
            profileFolder, 'webapps',
            buildAppName + '.' + gaiaDomain);
        return installOneApp(targetFolder, buildAppName,
                             remotePath, gaiaDomain, adb);
      }
    })
    .then(function() {
      if (options.VARIANT_PATH) {
        return installSvoperapps(profileFolder, adb);
      }
    })
    .then(function() {
      if (buildAppName === '*') {
        return sh.run(['-c', adb + ' push ' +
          '"' + options.DEFAULT_GAIA_ICONS_FONT + '"' +
          ' //system/fonts/hidden/gaia-icons.ttf']);
      }
    })
    .then(function() {
      if (buildAppName === '*') {
        return sh.run(['-c', adb + ' push ' +
          '"' + options.DEFAULT_KEYBOAD_SYMBOLS_FONT + '"' +
          ' //system/fonts/hidden/Keyboard-Symbols.ttf']);
      }
    })
    .then(function() {
      if (buildAppName === '*' || restartB2g) {
        utils.log(JOB_NAME, 'Restarting B2G...');
        sh.run(['-c', adb + ' shell start b2g']);
      } else {
        var manifest;
        return Promise.resolve()
          .then(function() {
          // Some app folder name is different with the process name,
          // ex. sms -> Messages
            manifest = utils.readZipManifest(utils.getFile(targetFolder));
          })
          .then(function() {
            utils.log(JOB_NAME, 'Restarting ' + manifest.name + '...');
            utils.killAppByPid(manifest.name, gaiaDir);
          });
      }
    })
    .catch(function(err) {
      utils.log(JOB_NAME, err);
      utils.exit(1);
    });
}

exports.execute = execute;
exports.installSvoperapps = installSvoperapps;
exports.getRemoteInstallPath = getRemoteInstallPath;
exports.pushToDevice = pushToDevice;
