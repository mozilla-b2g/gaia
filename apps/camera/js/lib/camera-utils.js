define(function(require) {
  /*jshint maxlen:false*/
  'use strict';

  var debug = require('debug')('camera-utils');

  var CameraUtils = function CameraUtils() {};

  CameraUtils.scaleSizeToFitViewport = function(viewportSize, imageSize) {
    var sw = viewportSize.width / imageSize.width,
        sh = viewportSize.height / imageSize.height,
        scale;

    // Select the smaller scale to fit image completely within the viewport
    scale = Math.min(sw, sh);

    return {
      width: imageSize.width * scale,
      height: imageSize.height * scale
    };
  };

  CameraUtils.scaleSizeToFillViewport = function(viewportSize, imageSize) {
    var sw = viewportSize.width / imageSize.width,
        sh = viewportSize.height / imageSize.height,
        scale;

    // Select the larger scale to fill and overflow viewport with image
    scale = Math.max(sw, sh);

    return {
      width: imageSize.width * scale,
      height: imageSize.height * scale
    };
  };

  /**
   * This implementation is loosely based around AOSP's
   * Camera.Util.getOptimalPreviewSize() method:
   *
   * http://androidxref.com/4.0.4/xref/packages/apps/Camera/src/com/android/camera/Util.java#374
   */
  CameraUtils.getOptimalPreviewSize =
    function(previewSizes, targetSize, viewportSize) {

      // Use a very small tolerance because we want an exact match.
      const ASPECT_TOLERANCE = 0.001;
      
      if (!previewSizes || previewSizes.length === 0) {
        return null;
      }

      var optimalSize;
      var minDiff = Number.MAX_VALUE;

      // If no viewport size is specified, use screen height
      var targetHeight = viewportSize ?
        Math.min(viewportSize.height, viewportSize.width) :
        window.innerWidth;

      if (targetHeight <= 0) {
        targetHeight = window.innerWidth;
      }

      var targetRatio = targetSize.width / targetSize.height;

      // Try to find an size match aspect ratio and size
      previewSizes.forEach(function(previewSize) {
        var ratio = previewSize.width / previewSize.height;
        var diff;

        if (Math.abs(ratio - targetRatio) <= ASPECT_TOLERANCE) {
          // Use Math.sqrt() to err on the side of a slightly larger
          // preview size in the event of a tie.
          diff = Math.abs(
            Math.sqrt(previewSize.height) - Math.sqrt(targetHeight));

          if (diff < minDiff) {
            optimalSize = previewSize;
            minDiff = diff;
          }
        }
      });

      // Cannot find the one match the aspect ratio. This should not happen.
      // Ignore the requirement.
      if (!optimalSize) {
        debug('No preview size to match the aspect ratio');
        minDiff = Number.MAX_VALUE;

        previewSizes.forEach(function(previewSize) {

          // Use Math.sqrt() to err on the side of a slightly larger
          // preview size in the event of a tie.
          var diff = Math.abs(
            Math.sqrt(previewSize.height) - Math.sqrt(targetHeight));

          if (diff < minDiff) {
            optimalSize = previewSize;
            minDiff = diff;
          }
        });
      }

      return optimalSize;
    };

  CameraUtils.prototype = {
    constructor: CameraUtils
  };

  return CameraUtils;
});
