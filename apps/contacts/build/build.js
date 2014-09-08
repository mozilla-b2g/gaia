'use strict';

/* global require, exports */
const utils = require('utils');
const importBuild = require('import-config.js');

const DEBUG = false;

var CommAppBuilder = function() {
};

// set destination directory and application directory
CommAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);

  this.webapp = utils.getWebapp(this.appDir.path, options.GAIA_DOMAIN,
    options.GAIA_SCHEME, options.GAIA_PORT, options.STAGE_DIR);
  this.gaia = utils.gaia.getInstance(options);

  this.gaia.stageDir = this.stageDir;
  this.gaia.gaiaDir = options.GAIA_DIR;
};

CommAppBuilder.prototype.generateManifest = function() {
  var manifestObject =
    importBuild.generateManifest(this.webapp, this.gaia);

  var file = utils.getFile(this.stageDir.path, 'manifest.webapp');
  var args = DEBUG ? [manifestObject, undefined, 2] : [manifestObject];
  utils.writeContent(file, JSON.stringify.apply(JSON, args));
};

CommAppBuilder.prototype.generateAll = function() {
  this.generateManifest();

  importBuild.generateConfig('communications', this.gaia);
};

CommAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.generateAll();
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new CommAppBuilder()).execute(options);
};
