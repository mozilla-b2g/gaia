'use strict';

/* global require, exports */
var utils = require('utils');

var GalleryAppBuilder = function() {
};

GalleryAppBuilder.prototype.DIST_DIR = 'build_stage/gallery';

GalleryAppBuilder.prototype.DEFAULT_VALUE = {
  maxImagePixelSize: 5 * 1024 * 1024,
  maxSnapshotPixelSize: 5 * 1024 * 1024,
  maxPickPixelSize: 0,
  maxEditPixelSize: 0
};

GalleryAppBuilder.prototype.setOptions = function(options) {
  var distDirPath = [options.GAIA_DIR].concat(this.DIST_DIR.split('/'));
  this.distDir = utils.getFile.apply(utils, distDirPath);
};

GalleryAppBuilder.prototype.customizeMaximumImageSize = function(options) {

  // On low-memory devices like Tarako, we need different default values
  if (options.GAIA_MEMORY_PROFILE === 'low') {
    this.DEFAULT_VALUE.maxImagePixelSize = 2 * 1024 * 1024;
    this.DEFAULT_VALUE.maxSnapshotPixelSize = 1600 * 1200; // Tarako camera size
    // Reduce the size of images returned by pick activities because
    // we have to rotate many images on Tarako
    this.DEFAULT_VALUE.maxPickPixelSize = 800 * 600;
    // On Tarako devices we can't reliably edit full-size photos.
    // This setting reduces them to quarter size before editing.
    // This should make the editor UI more responsive and less prone
    // to crashing. But it also means that edited photos will be .5
    // megapixel instead of 2 megapixel
    this.DEFAULT_VALUE.maxEditPixelSize = 800 * 600;
  }
  else if (options.GAIA_MEMORY_PROFILE === '256') {
    this.DEFAULT_VALUE.maxImagePixelSize = 3 * 1024 * 1024;
  }

  var distDir = options.GAIA_DISTRIBUTION_DIR;
  var customize = JSON.parse(utils.getDistributionFileContent('gallery',
                this.DEFAULT_VALUE, distDir));
  var content =
    '//\n' +
    '// This file is automatically generated: DO NOT EDIT.\n' +
    '//\n'+
    '// The default value of these variables depends on the\n'+
    '// GAIA_MEMORY_PROFILE environment variable. Set\n'+
    '// GAIA_MEMORY_PROFILE=low when building Gaia to get default\n'+
    '// values suitable for low-memory devices.\n'+
    '//\n'+
    '// To customize these values, create a gallery.json file in the\n' +
    '// distribution directory with content like this:\n' +    '//\n' +
    '//   {\n' +
    '//     "maxImagePixelSize": 6000000,\n' +
    '//     "maxSnapshotPixelSize": 4000000,\n' +
    '//     "maxPickPixelSize": 480000,\n' +
    '//     "maxEditPixelSize": 480000 }\n' +
    '//   }\n' +
    '//\n' +
    '// Optionally, you can also define variables to specify the\n' +
    '// minimum EXIF preview size that will be displayed as a\n' +
    '// full-screen preview by adding a property like this:\n' +
    '//\n' +
    '// "requiredEXIFPreviewSize": { "width": 640, "height": 480}\n' +
    '//\n' +
    '// If you do not specify this property then EXIF previews will only\n' +
    '// be used if they are big enough to fill the screen in either\n' +
    '// width or height in both landscape and portrait mode.\n' +
    '//\n' +
    'var CONFIG_MAX_IMAGE_PIXEL_SIZE = ' +
      customize.maxImagePixelSize + ';\n' +
    'var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE = ' +
      customize.maxSnapshotPixelSize + ';\n' +
    'var CONFIG_MAX_PICK_PIXEL_SIZE = ' +
      customize.maxPickPixelSize + ';\n' +
    'var CONFIG_MAX_EDIT_PIXEL_SIZE = ' +
      customize.maxEditPixelSize + ';\n';

    if (customize.requiredEXIFPreviewSize) {
      content +=
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = ' +
        customize.requiredEXIFPreviewSize.width + ';\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = ' +
        customize.requiredEXIFPreviewSize.height + ';\n';
    } else {
      content +=
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = 0;\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = 0;\n';
    }
    var file = utils.getFile(this.distDir.path, 'js', 'config.js');
    utils.writeContent(file, content);
};

GalleryAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.customizeMaximumImageSize(options);
};

exports.execute = function(options) {
  (new GalleryAppBuilder()).execute(options);
};
