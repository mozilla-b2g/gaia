'use strict';

/* global require, exports */
var utils = require('utils');
var SearchAppBuilder = function() {};

function pickAsset(root, filename, ppx) {
  if (ppx !== '1') {
    var suffix = '@' + ppx + 'x';
    var hdpiFile = filename.replace(/(\.[a-z]+$)/, suffix + '$1');
    var file = utils.getFile(root.path, hdpiFile);
    if (file.exists()) {
      return file;
    }
  }
  return utils.getFile(root.path, filename);
}

SearchAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.buildDir = utils.getFile(this.appDir.path, '/build');
  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
};

SearchAppBuilder.prototype.initTopsitesJSON = function() {
  var defaultJSONpath =
    utils.joinPath(this.appDir.path, 'build', 'topsites.json');
  var defaultJson = utils.getJSON(utils.getFile(defaultJSONpath));

  defaultJson.forEach(function(site) {
    if (site.tilePath) {
      var file = pickAsset(this.buildDir, site.tilePath,
                           this.options.GAIA_DEV_PIXELS_PER_PX);
      var icon = utils.getFileAsDataURI(file);
      site.tile = icon;
      delete site.tilePath;
    }
  }.bind(this));

  var file = utils.getFile(this.stageDir.path, 'js', 'inittopsites.json');
  var fileContents = utils.getDistributionFileContent('topsites', defaultJson,
                                                      this.distDirPath);
  utils.writeContent(file, fileContents);
};

SearchAppBuilder.prototype.execute = function(options) {
  this.options = options;
  this.setOptions(options);
  this.initTopsitesJSON();
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new SearchAppBuilder()).execute(options);
};
