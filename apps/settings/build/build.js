'use strict';

/* global require, exports, dump */
var utils = require('utils');

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

SettingsAppBuilder.prototype.writeSensorsJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR, 'resources', 'sensors.json');
  var defaultContent = { ambientLight: true };
  var content = utils.getDistributionFileContent('sensors',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

SettingsAppBuilder.prototype.writeFindMyDeviceConfigJSON = function(options) {
  var distDir = options.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(options.STAGE_APP_DIR,
    'resources', 'findmydevice.json');
  var defaultContent = {
    audience_url: 'https://oauth.accounts.firefox.com/v1',
  };

  var content = utils.getDistributionFileContent('findmydevice',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};

/**
 * Override default search providers if customized version found in
 * in /customization/search
 *
 * Copies providers.json and icon files into resources/search
 */
SettingsAppBuilder.prototype.overrideSearchProviders = function(options) {
  var distDirPath = options.GAIA_DISTRIBUTION_DIR;
  if (!distDirPath) {
    return;
  }
  var appDirPath = options.APP_DIR;
  var searchDir = utils.getFile(appDirPath, this.RESOURCES_PATH, 'search');
  var distSearchDir = utils.getFile(distDirPath, 'search');
  if (!distSearchDir.exists() || !searchDir.exists()) {
    return;
  }
  var files = utils.ls(distSearchDir);
  files.forEach(function(file) {
    file.copyTo(searchDir, file.leafName);
  });
};

SettingsAppBuilder.prototype.executeRjs = function(options) {
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

SettingsAppBuilder.prototype.writeGitCommit = function(options) {
  var gitDir = utils.getFile(options.GAIA_DIR, '.git');
  var overrideCommitFile = utils.getFile(options.GAIA_DIR,
    'gaia_commit_override.txt');
  var commitFile = utils.getFile(options.STAGE_APP_DIR, 'resources');
  utils.ensureFolderExists(commitFile);

  commitFile.append('gaia_commit.txt');
  if (overrideCommitFile.exists()) {
    if (commitFile.exists()) {
      commitFile.remove(false);
    }
    overrideCommitFile.copyTo(commitFile.parent, commitFile.leafName);
  } else if(gitDir.exists()) {
    var sh = new utils.Commander('sh');
    sh.initPath(utils.getEnvPath());

    sh.run(['-c', 'git --git-dir=' + gitDir.path + ' log -1 ' +
      '--format="%H%n%ct" HEAD > ' + commitFile.path]);
  } else {
    utils.writeContent(commitFile,
      'Unknown Git commit; build date shown here.\n' +
      parseInt(Date.now()/1000) + '\n');
  }
};

SettingsAppBuilder.prototype.execute = function(options) {
  this.executeRjs(options);
  this.writeGitCommit(options);
  this.writeSensorsJSON(options);
  this.writeSupportsJSON(options);
  this.writeFindMyDeviceConfigJSON(options);
  this.overrideSearchProviders(options);
};

exports.execute = function(options) {
  (new SettingsAppBuilder()).execute(options);
};
