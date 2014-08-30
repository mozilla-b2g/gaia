define(function(require) {
  /*jshint maxlen:false*/
  'use strict';

  var debug = require('debug')('camera-utils');

  var CameraUtils = {};

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
   * Finds the "optimal" preview size in the provided list of
   * preview sizes that is greater-than or equal to both the
   * the width *AND* height of the target viewport and has the
   * minimum delta pixel count compared to the target viewport.
   * If no preview size meets this criteria, the largest preview
   * size will be returned.
   *
   * NOTE: Preview streams are to be cropped from the center of
   * the camera sensor. Therefore, since we size/position the
   * viewfinder from the center of the screen using an aspect-fill
   * algorithm, we do not need to consider the aspect-ratio of the
   * preview sizes. The viewfinder never alters the aspect-ratio
   * of the preview stream and simply scales it up/down from the
   * center of the screen until the entire viewport is filled.
   *
   * @param  {Array} previewSizes
   * @param  {Object=} viewportSize
   * @return {Object}
   */
  CameraUtils.getOptimalPreviewSize = function(previewSizes, viewportSize) {
    var targetWidth = viewportSize ?
      Math.max(viewportSize.width, viewportSize.height) :
      Math.ceil(window.innerHeight * window.devicePixelRatio);
    var targetHeight = viewportSize ?
      Math.min(viewportSize.width, viewportSize.height) :
      Math.ceil(window.innerWidth * window.devicePixelRatio);
    
    var minDelta = Number.MAX_VALUE;
    var optimalSize;

    // Find the preview size that is greater-than or equal to both
    // the width *AND* height of the target viewport and has the
    // minimum delta pixel count compared to the target viewport.
    previewSizes.forEach(function(previewSize) {
      // Only consider preview sizes that have a width *AND*
      // height that are greater-than or equal to the target
      // viewport's width and height.
      if (previewSize.width < targetWidth ||
          previewSize.height < targetHeight) {
        return;
      }

      // Use Math.sqrt() to err on the side of a slightly larger
      // preview size in the event of a tie.
      var delta = Math.abs(
        Math.sqrt(previewSize.width * previewSize.height) -
        Math.sqrt(targetWidth * targetHeight)
      );

      // If this preview size is closer to matching the pixel
      // count of the target viewport, select it as the "optimal"
      // preview size and set a new minimum pixel count delta to
      // target.
      if (delta < minDelta) {
        minDelta = delta;
        optimalSize = previewSize;
      }
    });

    // If an "optimal" preview size has been found, return it.
    if (optimalSize) {
      return optimalSize;
    }

    // If an "optimal" preview size still has not been selected,
    // then there is no preview size that is greater-than or equal
    // to the width and height of the target viewport. In this case,
    // simply select the preview size with the highest pixel count.
    debug('No preview size is as large as the target viewport');
    return previewSizes.sort(function(a, b) {
      return (b.width * b.height) - (a.width * a.height);
    })[0];
  };

  /**
   * Get the maximum preview size (in terms of area) from a list of
   * possible preview sizes.
   *
   * NOTE: If an `aspectRatio` value is provided, the search will be
   * constrained to only accept preview sizes matching that aspect
   * ratio.
   *
   * @param  {Array} previewSizes
   * @param  {Number} aspectRatio
   * @return {Object}
   */
  CameraUtils.getMaximumPreviewSize = function(previewSizes, aspectRatio) {

    // Use a very small tolerance because we want an exact match if we are
    // constraining to only include specific aspect ratios.
    const ASPECT_TOLERANCE = 0.001;

    var maximumArea = 0;
    var maximumPreviewSize = null;
    previewSizes.forEach(function(previewSize) {
      var area = previewSize.width * previewSize.height;

      if (aspectRatio) {
        var ratio = previewSize.width / previewSize.height;
        if (Math.abs(ratio - aspectRatio) > ASPECT_TOLERANCE) {
          return;
        }
      }

      if (area > maximumArea) {
        maximumArea = area;
        maximumPreviewSize = previewSize;
      }
    });

    return maximumPreviewSize;
  };

  return CameraUtils;
});
