'use strict';

/* global require, exports */
const utils = require('utils');
const importBuild = require('import-config.js');

const DEBUG = false;

var FtuAppBuilder = function() {
};

// set destination directory and application directory
FtuAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);

  this.webapp = utils.getWebapp(this.appDir.path, options.GAIA_DOMAIN,
    options.GAIA_SCHEME, options.GAIA_PORT, options.STAGE_DIR);
  this.gaia = utils.gaia.getInstance(options);

  this.gaia.stageDir = this.stageDir;
  this.gaia.gaiaDir = options.GAIA_DIR;
};

FtuAppBuilder.prototype.generateManifest = function() {
  var manifestObject =
    importBuild.generateManifest(this.webapp, this.gaia);

  var file = utils.getFile(this.stageDir.path, 'manifest.webapp');
  var args = DEBUG ? [manifestObject, undefined, 2] : [manifestObject];
  utils.writeContent(file, JSON.stringify.apply(JSON, args));
};

FtuAppBuilder.prototype.generateAll = function() {
  this.generateManifest();

  importBuild.generateConfig('ftu', '/', this.gaia);
};

FtuAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.generateAll();
};

exports.execute = function(options) {
  (new FtuAppBuilder()).execute(options);
};
