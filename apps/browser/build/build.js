'use strict';

/* global require, exports */
var utils = require('utils');

var BrowserAppBuilder = function() {
};

// set options
BrowserAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
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
