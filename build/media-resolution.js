/*global require, exports*/
'use strict';
var utils = require('./utils');

var MediaResolution = function() {
  this.config = null;
  this.webapp = null;
  this.buildDir = null;
};

MediaResolution.prototype.setOptions = function(option) {
  this.config = option.config;
  this.webapp = option.webapp;
  this.buildDir = this.webapp.buildDirectoryFile;
};

// If config.GAIA_DEV_PIXELS_PER_PX is not 1 and the file is a bitmap or video
// let's check if there is a bigger version in the directory.
// If so let's ignore the file in order to use the bigger version later.
MediaResolution.prototype.pickMediaByResolution = function(file) {
  if (!/\.(png|gif|jpg|webm|mp4|m4v|ogg|ogv)$/.test(file.path)) {
    return;
  }
  var gaiaPixelsPerPx = this.config.GAIA_DEV_PIXELS_PER_PX;
  var suffix = '@' + gaiaPixelsPerPx + 'x';
  var matchResult = /@([0-9]+\.?[0-9]*)x/.exec(file.path);

  if ((gaiaPixelsPerPx === '1' && matchResult) ||
      (matchResult && matchResult[1] !== gaiaPixelsPerPx)) {
      file.remove(true);
  }

  if (gaiaPixelsPerPx !== '1') {
    if (matchResult && matchResult[1] === gaiaPixelsPerPx) {
      // Save the hidpi file to the zip, strip the name to be more generic.
      utils.copyFileTo(file.path, file.parent.path,
        utils.basename(file.path).replace(suffix, ''), true);
      file.remove(true);
    } else {
      // Check if there a hidpi file. If yes, let's ignore this file since
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

MediaResolution.prototype.fileProcess = function(file) {
  this.pickMediaByResolution(file);
};

MediaResolution.prototype.execute = function(options) {
  this.setOptions(options);

  // sort listing by path to ensure hidpi files are processed *after* the
  // corresponding 1x file
  var files = utils.ls(this.buildDir, true).sort(function(a, b) {
    if(a.path < b.path) {
      return -1;
    }
    if(a.path > b.path) {
      return 1;
    }
    return 0;
  });
  files.forEach(this.fileProcess.bind(this));
};

function execute(config) {
  var gaia = utils.gaia.getInstance(config);
  gaia.webapps.forEach(function(webapp) {
    (new MediaResolution()).execute({webapp: webapp, config: config});
  });

}

exports.execute = execute;
exports.MediaResolution = MediaResolution;
