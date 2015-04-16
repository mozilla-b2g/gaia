'use strict';

/* global require, exports, dump */
var utils = require('utils');
var jsmin = require('jsmin');

var jsSuffix = /\.js$/;

function hasGitCommand() {
  return utils.getEnvPath().some(function(path) {
    try {
      var cmd = utils.getFile(path, 'git');
      return cmd.exists();
    } catch (e) {
      // path nout found
    }
    return false;
  });
}


// FIXME: execute any command without shell does not work on build machine for
// flame, so we need this workaround to fix this issue. please remove it if
// bug 1044981 is fixed.
function executeGitByShell(gitDirPath, commitFilePath) {
  var sh = new utils.Commander('sh');
  sh.initPath(utils.getEnvPath());

  sh.run(['-c', 'git --git-dir=' + gitDirPath + ' log -1 ' +
    '--format="%H%n%ct" HEAD > ' + commitFilePath]);
}

var SettingsAppBuilder = function() {
};

SettingsAppBuilder.prototype.RESOURCES_PATH = 'resources';

SettingsAppBuilder.prototype.writeSupportsJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources', 'support.json');
  var defaultContent = null;
  var content = utils.getDistributionFileContent('support',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.writeDeviceFeaturesJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources',
                           'device-features.json');
  var defaultContent = {
    ambientLight: true,
    vibration: true
  };
  var content = utils.getDistributionFileContent('device-features',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.writeFindMyDeviceConfigJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR,
    'resources', 'findmydevice.json');
  var defaultContent = {
    api_url: 'https://find.firefox.com',
    api_version: '1',
  };

  var content = utils.getDistributionFileContent('findmydevice',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.writeEuRoamingJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources',
                           'eu-roaming.json');
  var defaultContent = {};
  var content = utils.getDistributionFileContent('eu-roaming',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.executeRjs = function(options) {
  var deferred = utils.Q.defer();

  var configFile = utils.getFile(options.APP_DIR, 'build',
    'settings.build.jslike');
  var r = require('r-wrapper').get(options.GAIA_DIR);
  // Simply use r.js for merging scripts as it does not support es6 syntax.
  // Minifying will be done by other tools later.
  r.optimize([configFile.path, 'optimize=none'], function() {
    dump('r.js optimize ok\n');
    deferred.resolve();
  }, function(err) {
    dump('r.js optmize failed:\n');
    dump(err + '\n');
    deferred.resolve();
  });

  return deferred.promise;
};

SettingsAppBuilder.prototype.executeJsmin = function(options) {
  if (options.GAIA_OPTIMIZE === '1') {
    utils.listFiles(options.STAGE_APP_DIR, utils.FILE_TYPE_FILE, true).forEach(
      function(filePath) {
        if (jsSuffix.test(filePath)) {
          try {
            var file = utils.getFile(filePath);
            var content = utils.getFileContent(file);
            utils.writeContent(file, jsmin(content).code);
          } catch(e) {
            utils.log('Error minifying content: ' + filePath);
          }
        }
    });
  }
};

SettingsAppBuilder.prototype.writeGitCommit = function(options) {
  var gitDir = utils.getFile(options.GAIA_DIR, '.git');
  var overrideCommitFile = utils.getFile(options.GAIA_DIR,
    'gaia_commit_override.txt');
  var commitFile = utils.getFile(options.STAGE_APP_DIR, 'resources');
  utils.ensureFolderExists(commitFile);

  commitFile.append('gaia_commit.txt');
  if (overrideCommitFile.exists()) {
    utils.copyFileTo(overrideCommitFile, commitFile.parent.path,
      commitFile.leafName);
  } else if(gitDir.exists() && hasGitCommand()) {
    var git = new utils.Commander('git');
    var stderr, stdout;
    var args = [
      '--git-dir=' + gitDir.path,
      'log', '-1',
      '--format=%H%n%ct',
      'HEAD'];
    var cmdOptions = {
      stdout: function(data) {
        stdout = data;
      },
      stderr: function(data) {
        stderr = data;
      },
      done: function(data) {
        if (data.exitCode !== 0) {
          var errStr = 'Error writing git commit file!\n' + 'stderr: \n' +
            stderr + '\nstdout: ' + stdout;
          utils.log('settings-app-build', errStr);
          utils.log('settings-app-build', 'fallback to execute git by shell');
          // FIXME: see comment on executeGitByShell()
          executeGitByShell(gitDir.path, commitFile.path);
        } else {
          utils.log('settings-app-build', 'Writing git commit information ' +
            'to: ' + commitFile.path);
          utils.writeContent(commitFile, stdout);
        }
      }
    };
    git.initPath(utils.getEnvPath());
    git.runWithSubprocess(args, cmdOptions);
  } else {
    utils.writeContent(commitFile,
      'Unknown Git commit; build date shown here.\n' +
      parseInt(Date.now()/1000) + '\n');
  }
};

SettingsAppBuilder.prototype.execute = function(options) {
  this.writeGitCommit(options);
  this.writeDeviceFeaturesJSON(options);
  this.writeSupportsJSON(options);
  this.writeFindMyDeviceConfigJSON(options);
  this.writeEuRoamingJSON(options);

  return this.executeRjs(options).then(function() {
    this.executeJsmin(options);
  }.bind(this));
};

exports.execute = function(options) {
  return (new SettingsAppBuilder()).execute(options);
};
