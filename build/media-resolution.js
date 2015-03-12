'use strict';

/**
 * Filter images/video by GAIA_DEV_PIXELS_PER_PX.
 */

var utils = require('./utils');

var MediaResolution = function() {
  this.options = null;
};

MediaResolution.prototype.setOptions = function(options) {
  this.options = options;
};

// If options.GAIA_DEV_PIXELS_PER_PX is not 1 and the file is a bitmap or video
// let's check if there is a bigger version in the directory.
// If so let's ignore the file in order to use the bigger version later.
MediaResolution.prototype.pickMediaByResolution = function(file) {
  if (!/\.(png|gif|jpg|webm|mp4|m4v|ogg|ogv)$/.test(file.path)) {
    return;
  }

  var gaiaPixelsPerPx = this.options.GAIA_DEV_PIXELS_PER_PX;
  var suffix = '@' + gaiaPixelsPerPx + 'x';
  var matchResult = /@([0-9]+\.?[0-9]*)x/.exec(file.path);

  if ((gaiaPixelsPerPx === '1' && matchResult) ||
      (matchResult && matchResult[1] !== gaiaPixelsPerPx) && file.exists()) {
      file.remove(true);
  }

  if (gaiaPixelsPerPx !== '1') {
    if (matchResult && matchResult[1] === gaiaPixelsPerPx) {
      // Save the hidpi file to the zip, strip the name to be more generic.
      utils.copyFileTo(file.path, file.parent.path,
        utils.basename(file.path).replace(suffix, ''));
      if (file.exists()) {
        file.remove(true);
      }
    } else {
      // Check if there a hidpi file. If yes, let's ignore this file since
      // it will be loaded later (or it has already been loaded, depending on
      // how the OS organize files.
      var hqfile = utils.getFile(
        file.path.replace(/(\.[a-z]+$)/, suffix + '$1'));
      if (hqfile.exists() && file.exists()) {
        file.remove(true);
      }
    }
  }
};

MediaResolution.prototype.execute = function(options) {
  this.setOptions(options);

  // Sort listing by path to ensure hidpi files are processed *after* the
  // corresponding 1x file
  var buildDir = utils.getFile(options.webapp.buildDirectoryFilePath);
  var files = utils.ls(buildDir, true).sort(function(a, b) {
    if(a.path < b.path) {
      return -1;
    }
    if(a.path > b.path) {
      return 1;
    }
    return 0;
  });
  files.forEach(this.pickMediaByResolution, this);
};

function execute(options) {
  (new MediaResolution()).execute(options);
}

exports.execute = execute;
exports.MediaResolution = MediaResolution;
