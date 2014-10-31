'use strict';

/* global require, exports, dump */
var utils = require('utils');

function hasGitCommand() {
  return utils.getEnvPath().some(function(path) {
    try {
      var cmd = utils.getFile(path, 'git');
      return cmd.exists();
    } catch (e) {
      // path not found
    }
    return false;
  });
}

var PrivacyPanelAppBuilder = function() {};

PrivacyPanelAppBuilder.prototype.readVersionFile = function(options) {
  var aboutFile = utils.getFile(options.STAGE_APP_DIR, '/resources/about.json');
  var aboutFileContent = utils.getFileContent(aboutFile);
  return aboutFileContent;
};

PrivacyPanelAppBuilder.prototype.getLastCommit = function(options, callback) {
  var gitDir = utils.getFile(options.GAIA_DIR, '.git');
  if (gitDir.exists() && hasGitCommand()) {
    var git = new utils.Commander('git');
    var stderr, stdout;
    var args = [
      '--git-dir=' + gitDir.path,
      'log',
      '--format=%H',
      'HEAD',
      '-1'
    ];

    var cmdOptions = {
      stdout: function(data) {
        stdout = data;
      },
      stderr: function(data) {
        stderr = data;
      },
      done: function(data) {
        if (data.exitCode === 0) {
          utils.log('privacy-panel-app-build', 'Last commit: ' + stdout);
          callback(stdout);
        }
      }
    };

    git.initPath(utils.getEnvPath());
    git.runWithSubprocess(args, cmdOptions);
  }
};

PrivacyPanelAppBuilder.prototype.executeRjs = function(options) {
  var optimize = 'optimize=' +
    (options.GAIA_OPTIMIZE === '1' ? 'uglify2' : 'none');
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'settings.build.jslike');
  var r = require('r-wrapper').get(options.GAIA_DIR);
  r.optimize([configFile.path, optimize], function() {
    dump('require.js optimize ok\n');
  }, function(err) {
    dump('require.js optmize failed:\n');
    dump(err + '\n');
  });
};

PrivacyPanelAppBuilder.prototype.execute = function(options) {
  this.executeRjs(options);

  this.getLastCommit(options, function(commit) {
    var aboutFile = utils
      .getFile(options.STAGE_APP_DIR, '/resources/about.json');
    var aboutContent = utils
      .readJSONFromPath(options.STAGE_APP_DIR + '/resources/about.json');

    aboutContent.build = commit.substring(0, 10);
    utils.writeContent(aboutFile, JSON.stringify(aboutContent));
  });
};

exports.execute = function(options) {
  (new PrivacyPanelAppBuilder()).execute(options);
};
