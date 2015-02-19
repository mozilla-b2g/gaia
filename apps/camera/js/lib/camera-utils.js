define(function(require) {
  /*jshint maxlen:false*/
  'use strict';

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
