'use strict';

/* global require, exports */
var utils = require('utils');

var APP_LIST = ['dashboard'];

var TVTestsBuilder = function() {
};

// set options
TVTestsBuilder.prototype.setOptions = function(options) {
  this.appDir = utils.getFile(options.APP_DIR);
  this.gaiaDir = utils.getFile(options.GAIA_DIR);
  // directories for tv-tests.
  this.hostDir = utils.getTempFolder();
  this.tvAppsDir = this.gaiaDir.clone();
  this.tvAppsDir.append('tv_apps');
  this.sharedDir = this.gaiaDir.clone();
  this.sharedDir.append('shared');

  // if host already exist, we should remove it for copying latest apps.
  if (this.hostDir.exists()) {
    this.hostDir.remove(true);
  }
};

TVTestsBuilder.prototype.copyTVApp = function(appName) {
  var appSrc = this.tvAppsDir.clone();
  appSrc.append(appName);

  var appDest = this.hostDir.clone();
  appDest.append(appName);

  // copy app folder to build stage
  utils.copyDirTo(appSrc, this.hostDir.path, appName);

  // copy shared folder to app folder
  utils.copyDirTo(utils.joinPath(this.sharedDir.path, 'js'),
                  utils.joinPath(appDest.path, 'shared'), 'js');
  utils.copyDirTo(utils.joinPath(this.sharedDir.path, 'style'),
                  utils.joinPath(appDest.path, 'shared'), 'style');
  utils.copyDirTo(utils.joinPath(this.sharedDir.path, 'locales'),
                  utils.joinPath(appDest.path, 'shared'), 'locales');
};

TVTestsBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  this.setOptions(options);
  APP_LIST.forEach(this.copyTVApp.bind(this));

  var config = this.appDir.clone();
  config.append('test');
  config.append('tv_configs.json');
  utils.writeContent(config, JSON.stringify({
    'apps_folder': this.hostDir.path
  }));
};

exports.execute = function(options) {
  (new TVTestsBuilder()).execute(options);
};
