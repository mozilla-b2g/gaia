'use strict';

/* global require, exports */
const utils = require('utils');
const importBuild = require('../../apps/communications/build/build-import.js');

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

  this.commsServices = importBuild.getCommsServices(this.gaia);
  this.official = options.OFFICIAL;
};



FtuAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  importBuild.generateManifest(this.webapp, this.commsServices, this.gaia);
  importBuild.generateConfig('ftu', '', this.gaia);
  importBuild.generateServicesConfig(this.commsServices, null, this.official,
                                     this.gaia);
};

exports.execute = function(options) {
  (new FtuAppBuilder()).execute(options);
};
