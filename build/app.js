'use strict';

/* global require, exports, quit */

var utils = require('utils');
var rebuild = require('rebuild');

function getAppRegExp(options) {
  var appRegExp;
  try {
    appRegExp = utils.getAppNameRegex(options.BUILD_APP_NAME);
  } catch (e) {
    utils.log('utils', 'Using an invalid regular expression for APP ' +
      'environment variable, APP=' + options.BUILD_APP_NAME);
    throw e;
  }
  return appRegExp;
}

function spawnProcess(module, appOptions) {
  let proc = utils.getProcess();
  let xpcshell = utils.getEnv('XPCSHELLSDK');
  let args = [
    '-f', utils.getEnv('GAIA_DIR') + '/build/xpcshell-commonjs.js',
    '-e', 'run("' + module + '", "' + JSON.stringify(appOptions)
      .replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '");'
  ];
  proc.init(utils.getFile(xpcshell));
  proc.run(false, args, args.length);
  return proc;
}

function buildApps(options) {
  var processes = [];
  var gaia = utils.gaia.getInstance(options);

  // A workaround for bug 1093267 in order to handle callscreen's l10n broken.
  // Callscreen will generate incorrect multilocale strings if
  // build_stage/communications/dialer/locales is removed by webapp-optimize.
  // After bug 1093267 has been resolved, we're going to get rid of this.
  var callscreen;
  var communications;
  var webapps = gaia.rebuildWebapps.filter(function(app) {
    var path = app.appDir.path;
    if (path.indexOf('callscreen') !== -1) {
      callscreen = app;
      return false;
    } else {
      return true;
    }
  });
  if (callscreen) {
    webapps.push(callscreen);
  }

  webapps.forEach(function(app) {
    let appDir = app.appDir.path;
    let appDirFile = utils.getFile(appDir);
    let appOptions = utils.cloneJSON(options);
    let stageAppDir = utils.getFile(options.STAGE_DIR, appDirFile.leafName);

    appOptions.APP_DIR = appDirFile.path;
    appOptions.STAGE_APP_DIR = stageAppDir.path;

    let buildFile = utils.getFile(appDir, 'build', 'build.js');
    // A workaround for bug 1093267
    if (buildFile.exists()) {
      utils.log('app', 'building ' + appDirFile.leafName + ' app...');

      if (parseInt(options.P) > 0) {
        // A workaround for bug 1093267
        if (appDir.indexOf('communications') !== -1) {
          communications = spawnProcess('build-app', appOptions);
          processes.push({
            name: 'communications',
            content: communications
          });
        } else {
          processes.push({
            name: appDirFile.leafName,
            content: spawnProcess('build-app', appOptions)
          });
        }
      } else {
        require('./build-app').execute(appOptions);
      }
    }
    // Do not spawn a new process since too many processes will slow it down
    else {
      // A workaround for bug 1093267
      if (appDir.indexOf('callscreen') !== -1) {
        if (communications) {
          utils.processEvents(function () {
            return { wait: communications.isRunning };
          });
        }
      }

      utils.copyToStage(appOptions);
      require('./post-app').execute(appOptions, app);
    }
  });

  utils.processEvents(function () {
    return {
      wait: processes.some(function(proc) {
        return proc.content.isRunning;
      })
    };
  });

  var failed = false;
  processes.forEach(function(proc) {
    var exitValue = proc.content.exitValue;
    if (exitValue !== 0) {
      failed = true;
      utils.log('failed', 'building ' + proc.name +
        ' app failed with exit code ' + exitValue);
    }
  });

  if (failed) {
    quit(1);
  }
}

exports.execute = function(options) {
  var stageDir = utils.getFile(options.STAGE_DIR);
  utils.ensureFolderExists(stageDir);

  if (options.BUILD_APP_NAME === '*') {
    options.rebuildAppDirs = rebuild.execute(options);
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
};

exports.buildApps = buildApps;
