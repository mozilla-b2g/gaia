'use strict';

var utils = require('./utils');

function getAppRegExp(options) {
  var appRegExp;
  try {
    appRegExp = utils.getAppNameRegex(options.BUILD_APP_NAME);
  } catch (e) {
    utils.log('app', 'Using an invalid regular expression for APP ' +
      'environment variable, APP=' + options.BUILD_APP_NAME);
    throw e;
  }
  return appRegExp;
}

function buildApps(options) {
  var processes = [];
  var gaia = utils.gaia.getInstance(options);

  var webapps = gaia.rebuildWebapps;

  // Those are not defined while running some tests
  if ('sharedFolder' in gaia && 'stageDir' in gaia) {
    utils.copyDirTo(gaia.sharedFolder.path, gaia.stageDir.path, 'shared');
  }

  webapps.forEach(function(app) {
    let appDir = app.appDirPath;
    let appDirFile = utils.getFile(appDir);
    let appOptions = utils.cloneJSON(options);
    let stageAppDir = utils.getFile(options.STAGE_DIR, appDirFile.leafName);

    appOptions.APP_DIR = appDirFile.path;
    appOptions.STAGE_APP_DIR = stageAppDir.path;

    let buildFile = utils.getFile(appDir, 'build', 'build.js');
    if (buildFile.exists()) {
      utils.log('app', 'building ' + appDirFile.leafName);

      if (parseInt(options.P) > 0) {
        processes.push({
          name: appDirFile.leafName,
          instance: utils.spawnProcess('./build-app', appOptions)
        });
      } else {
        require('./build-app').execute(appOptions);
      }
    }
    // Do not spawn a new process since too many processes will slow it down
    else {
      utils.copyToStage(appOptions);
      appOptions.webapp = app;
      require('./post-app').execute(appOptions);
    }
  });

  if (utils.isNode()) {
    let queue = processes.map((proc) => {
      return proc.instance;
    });
    Promise.all(queue).then((results) => {
      var failed = false;
      results.forEach((exitValue, i) => {
        if (exitValue !== 0) {
          failed = true;
          utils.log('app', 'Failed when building ' + processes[i].name +
            ' app failed with exit code ' + exitValue);
        }
      });
      if (failed) {
        utils.exit(1);
      }
    });
  } else {
    utils.processEvents(function () {
      return {
        wait: processes.some(function(proc) {
          return utils.processIsRunning(proc.instance);
        })
      };
    });

    var failed = false;
    processes.forEach(function(proc) {
      var exitValue = utils.getProcessExitCode(proc.instance);
      if (exitValue !== 0) {
        failed = true;
        utils.log('app', 'Failed when building ' + proc.name +
          ' app failed with exit code ' + exitValue);
      }
    });
    if (failed) {
      utils.exit(1);
    }
  }
}

exports.execute = function(options) {
  var stageDir = utils.getFile(options.STAGE_DIR);
  utils.ensureFolderExists(stageDir);

  if (options.BUILD_APP_NAME === '*') {
    options.rebuildAppDirs = require('./rebuild').execute(options);
  } else {
    options.rebuildAppDirs = options.GAIA_APPDIRS.split(' ')
      .filter(function(appDir) {
        let appDirFile = utils.getFile(appDir);
        return getAppRegExp(options).test(appDirFile.leafName);
      });
  }

  require('./pre-app').execute(options);

  // Wait for all pre app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  buildApps(options);

  var gaia = utils.gaia.getInstance(options);
  var appsDir = utils.joinPath(options.PROFILE_DIR, 'apps');
  var stageShared = utils.joinPath(gaia.stageDir.path, 'shared');
  utils.copyDirTo(stageShared, appsDir, 'shared');
};

exports.buildApps = buildApps;
