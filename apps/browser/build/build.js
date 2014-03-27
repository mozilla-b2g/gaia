'use strict';

/* global require, exports */
var utils = require('utils');

var BrowserAppBuilder = function() {
};

BrowserAppBuilder.prototype.APP_DIR = 'apps/browser';
BrowserAppBuilder.prototype.STAGE_DIR = 'build_stage/browser';
// set options
BrowserAppBuilder.prototype.setOptions = function(options) {
  var stageDirPath = [options.GAIA_DIR].concat(this.STAGE_DIR.split('/'));
  this.stageDir = utils.getFile.apply(utils, stageDirPath);

  var appDirPath = [options.GAIA_DIR].concat(this.STAGE_DIR.split('/'));
  this.appDir = utils.getFile.apply(utils, appDirPath);

  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
};

BrowserAppBuilder.prototype.initJSON = function() {
  var defaultJSONpath =
    utils.joinPath(this.appDir.path, 'build', 'default.json');
  var defaultJson = utils.getJSON(utils.getFile(defaultJSONpath));
  var file =
    utils.getFile(this.stageDir.path, 'js', 'init.json');
  utils.writeContent(file,
    utils.getDistributionFileContent('browser', defaultJson, this.distDirPath));
};

BrowserAppBuilder.prototype.generateManifest = function() {
  var manifest =
    utils.getJSON(utils.getFile(this.appDir.path, 'manifest.webapp'));
  manifest.role = 'system';
  delete manifest.activities;
  // Write content to build_stage
  utils.writeContent(utils.getFile(this.stageDir.path, 'manifest.webapp'),
                     JSON.stringify(manifest));
};

BrowserAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.initJSON();
  if (options.ROCKETBAR == 'full') {
    this.generateManifest();
  }
};

exports.execute = function(options) {
  (new BrowserAppBuilder()).execute(options);
};
