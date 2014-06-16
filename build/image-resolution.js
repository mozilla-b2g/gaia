/*global require, exports*/
'use strict';
var utils = require('./utils');

var ImageResolution = function() {
  this.config = null;
  this.webapp = null;
  this.buildDir = null;
};

ImageResolution.prototype.setOptions = function(option) {
  this.config = option.config;
  this.webapp = option.webapp;
  this.buildDir = this.webapp.buildDirectoryFile;
};

// If config.GAIA_DEV_PIXELS_PER_PX is not 1 and the file is a bitmap let's
// check if there is a bigger version in the directory. If so let's ignore the
// file in order to use the bigger version later.
ImageResolution.prototype.pickImageByResolution = function(file) {
  if (!/\.(png|gif|jpg)$/.test(file.path)) {
    return;
  }
  var suffix = '@' + this.config.GAIA_DEV_PIXELS_PER_PX + 'x';
  var matchResult = /@([0-9]+\.?[0-9]*)x/.exec(file.path);
  var gaiaPixelsPerPx = this.config.GAIA_DEV_PIXELS_PER_PX;


  if ((this.config.GAIA_DEV_PIXELS_PER_PX === '1' && matchResult) ||
      (matchResult && matchResult[1] !== this.config.GAIA_DEV_PIXELS_PER_PX)) {
      file.remove(true);
  }

  if (this.config.GAIA_DEV_PIXELS_PER_PX !== '1') {
    if (matchResult && matchResult[1] === this.config.GAIA_DEV_PIXELS_PER_PX) {
      // Save the hidpi file to the zip, strip the name to be more generic.
      utils.copyFileTo(file.path, file.parent.path,
        utils.basename(file.path).replace(suffix, ''), true);
      file.remove(true);
    } else {
      // Check if there a hidpi file. If yes, let's ignore this bitmap since
      // it will be loaded later (or it has already been loaded, depending on
      // how the OS organize files.
      var hqfile = utils.getFile(
        file.path.replace(/(\.[a-z]+$)/, suffix + '$1'));
      if (hqfile.exists()) {
        file.remove(true);
      }
    }
  }
};

ImageResolution.prototype.fileProcess = function(file) {
  this.pickImageByResolution(file);
};

ImageResolution.prototype.execute = function(options) {
  this.setOptions(options);

  var files = utils.ls(this.buildDir, true);
  files.forEach(this.fileProcess.bind(this));
};

function execute(config) {
  var gaia = utils.gaia.getInstance(config);
  gaia.webapps.forEach(function(webapp) {
    (new ImageResolution()).execute({webapp: webapp, config: config});
  });

}

exports.execute = execute;
exports.ImageResolution = ImageResolution;
