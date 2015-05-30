'use strict';

/* jshint node: true */

var utils = require('utils');
var importBuild = require('import-config.js');
var DEBUG = false;

var FtuAppBuilder = function() {
};

// Set destination directory and application directory
FtuAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.gaia = utils.gaia.getInstance(options);
  this.gaia.stageDir = this.stageDir;
  this.gaia.gaiaDir = options.GAIA_DIR;
};

FtuAppBuilder.prototype.generateManifest = function() {
  var manifestObject = importBuild.generateManifest(this.webapp, this.gaia);
  var file = utils.getFile(this.stageDir.path, 'manifest.webapp');
  var args = DEBUG ? [manifestObject, undefined, 2] : [manifestObject];
  utils.writeContent(file, JSON.stringify.apply(JSON, args));
};

FtuAppBuilder.prototype.generateAll = function() {
  this.generateManifest();
  importBuild.generateConfig('ftu', '/', this.gaia);
};

FtuAppBuilder.prototype.execute = function(options) {
  this.webapp = utils.getWebapp(options.APP_DIR, options);
  this.setOptions(options);
  this.generateAll();
};

exports.execute = function(options, webapp) {
  utils.copyToStage(options);
  (new FtuAppBuilder()).execute(options, webapp);
};
