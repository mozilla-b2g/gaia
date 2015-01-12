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
   * preview sizes that has the minimum delta pixel count compared
   * to the target viewport. If the capture resolution is also
   * provided, it will only match preview sizes which are less-than
   * or equal to it and prefer preview sizes which have the same
   * aspect ratio.
   *
   * If no preview size meets this criteria, the largest preview
   * or equal to it and prefer preview sizes which have the same
   * size will be returned.
   *
   * NOTE: Video recording must have a preview size which matches
   * the aspect ratio of the record size because of platform
   * limitations.
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
   * @param  {Object=} resolution
   * @return {Object}
   */
  CameraUtils.getOptimalPreviewSize = function(previewSizes, viewportSize, resolution) {
    var targetWidth = viewportSize ?
      Math.max(viewportSize.width, viewportSize.height) :
      Math.ceil(window.innerHeight * window.devicePixelRatio);
    var targetHeight = viewportSize ?
      Math.min(viewportSize.width, viewportSize.height) :
      Math.ceil(window.innerWidth * window.devicePixelRatio);
    var targetArea = targetWidth * targetHeight;
    
    var minDeltaAspect = Number.MAX_VALUE;
    var optimalSizeAspect;

    var minDelta = Number.MAX_VALUE;
    var optimalSize;

    // Find the preview size that is greater-than or equal to both
    // the width *AND* height of the target viewport and has the
    // minimum delta pixel count compared to the target viewport.
    previewSizes.forEach(function(previewSize) {
      // Ignore preview sizes that have a width *OR* height that
      // are greater-than the capture resolution's width and height.
      if (resolution && (previewSize.width > resolution.width ||
                         previewSize.height > resolution.height))
      {
        return;
      }

      // If this preview size is closer to matching the pixel
      // count of the target viewport, select it as the "optimal"
      // preview size and set a new minimum pixel count delta to
      // target.
      var delta = Math.abs(targetArea - 
        previewSize.width * previewSize.height
      );

      // If a resolution constraint is given, prefer preview sizes
      // that have the same aspect ratio as the resolution.
      if (resolution && previewSize.width * resolution.height ===
                        resolution.width * previewSize.height)
      {
        if (delta < minDeltaAspect) {
          minDeltaAspect = delta;
          optimalSizeAspect = previewSize;
        }
      } else if (delta < minDelta) {
        minDelta = delta;
        optimalSize = previewSize;
      }
    });

    // If an "optimal" preview size has been found, return it.
    if (optimalSizeAspect) {
      return optimalSizeAspect;
    }
    if (optimalSize) {
      return optimalSize;
    }

    // If an "optimal" preview size still has not been selected,
    // then there is no preview size that is less-than or equal to
    // the width and height of the capture resolution. In this case,
    // simply select the preview size with the highest pixel count.
    debug('No preview size is as small as the capture resolution');
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
