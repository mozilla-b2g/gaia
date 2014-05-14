'use strict';

/* global require, exports */
const utils = require('utils');
const importBuild = require('./build-import.js');

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

  this.commsServices = importBuild.getCommsServices(this.gaia);
  this.official = options.OFFICIAL;
};

CommAppBuilder.prototype.generateManifest = function() {
  importBuild.generateManifest(this.webapp, this.commsServices, this.gaia);
};

CommAppBuilder.prototype.generateContactsConfig = function(app, destination) {
  importBuild.generateConfig('communications', 'contacts', this.gaia);
};

CommAppBuilder.prototype.generateServicesConfig = function() {
  var dest = utils.getFile(this.gaia.stageDir.path, 'contacts',
                           'js', 'parameters.js');
  importBuild.generateServicesConfig(this.commsServices, dest,
                                     this.official, this.gaia);
};

CommAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.generateManifest();
  this.generateContactsConfig();
  this.generateServicesConfig();
};

exports.execute = function(options) {
  (new CommAppBuilder()).execute(options);
};
