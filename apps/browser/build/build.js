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

BrowserAppBuilder.prototype.initTopsitesJSON = function() {
  var defaultJSONpath =
    utils.joinPath(this.appDir.path, 'build', 'topsites.json');
  var defaultJson = utils.getJSON(utils.getFile(defaultJSONpath));

  defaultJson.topSites.forEach(function(site) {
    if (site.iconPath) {
      var file = utils.getFile(this.appDir.path, 'build', site.iconPath);
      var icon = utils.getFileAsDataURI(file);
      site.iconUri = icon;
      delete site.iconPath;
    }
  }.bind(this));

  var file =
    utils.getFile(this.stageDir.path, 'js', 'inittopsites.json');
  utils.writeContent(file,
    utils.getDistributionFileContent('topsites', defaultJson,
                                                 this.distDirPath));
};

BrowserAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.initJSON();
  this.initTopsitesJSON();
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new BrowserAppBuilder()).execute(options);
};
