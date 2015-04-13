'use strict';

/* jshint node: true */

var utils = require('utils');
var importBuild = require('import-config.js');
var DEBUG = false;

var CommAppBuilder = function() {
};

// Set destination directory and application directory
CommAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.gaia = utils.gaia.getInstance(options);
  this.gaia.stageDir = this.stageDir;
  this.gaia.gaiaDir = options.GAIA_DIR;
};

CommAppBuilder.prototype.generateManifest = function() {
  var manifestObject = importBuild.generateManifest(this.webapp, this.gaia);
  var file = utils.getFile(this.stageDir.path, 'manifest.webapp');
  var args = DEBUG ? [manifestObject, undefined, 2] : [manifestObject];
  utils.writeContent(file, JSON.stringify.apply(JSON, args));
};

CommAppBuilder.prototype.generateAll = function() {
  this.generateManifest();
  importBuild.generateConfig('communications', 'contacts', this.gaia);
};

CommAppBuilder.prototype.execute = function(options) {
  this.webapp = utils.getWebapp(options.APP_DIR, options);
  this.setOptions(options);
  this.generateAll();
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new CommAppBuilder()).execute(options);
};
