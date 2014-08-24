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
   * Given an array of supported preview resolutions, a photo size and
   * a viewport size, pick the best preview size. The optimum size is
   * the smallest preview that has the same aspect ratio as the photos
   * we are taking and is larger than the viewport in both dimension.
   *
   * If the viewport size is not specified, then the screen size
   * (in device pixels) is used instead.
   *
   * @param  {Array} previewSizes
   * @param  {Object} photoSize
   * @param  {Object} viewport
   * @return {Object}
   */
  CameraUtils.getOptimalPreviewSize =
    function(previewSizes, photoSize, viewport) {

      // If we don't have any preview sizes, we can't do anything
      if (!previewSizes || previewSizes.length === 0) {
        return null;
      }

      // What is the aspect ratio of the photos we are taking?
      var photoAspectRatio = photoSize.width / photoSize.height;

      // If no viewport size is specified, use the entire screen
      if (!viewport) {
        viewport = {
          width: window.innerWidth * window.devicePixelRatio,
          height: window.innerHeight * window.devicePixelRatio
        };
      }

      // Make sure the viewport is specified in landscape mode with
      // width being the longer dimension
      viewport = {
        width: Math.max(viewport.width, viewport.height),
        height: Math.min(viewport.width, viewport.height),
      };

      // How many total pixels are in the viewport?
      var viewportPixels = viewport.width * viewport.height;

      // Is this preview size big enough to fill the viewport?
      function bigEnough(preview) {
        return preview.width >= viewport.width &&
          preview.height >= viewport.height;
      }

      // Does this preview size match the aspect ratio of the photos?
      function aspectRatioMatches(preview) {
        var previewRatio = preview.width / preview.height;
        return Math.abs(previewRatio - photoAspectRatio) < 0.001;
      }

      // How well does this preview fit the viewport?
      // Larger numbers are better matches.
      // Returns Infinity for a perfect match.
      function matchQuality(preview) {
        var diff = Math.abs(preview.width * preview.height - viewportPixels);
        return viewportPixels/diff;
      }

      var bestPreview = null;
      var bestQuality = 0;
      var i, preview, quality;

      // Loop through the available preview sizes, looking for the best one
      for(i = 0; i < previewSizes.length; i++) {
        preview = previewSizes[i];

        // Only consider preview sizes that are big enough and have the
        // right aspect ratio
        if (bigEnough(preview) && aspectRatioMatches(preview)) {
          // If this preview size is closer to the viewport size than the
          // previous best preview size, then remember it as the best
          // we've seen so far.
          quality = matchQuality(preview);
          if (quality > bestQuality) {
            bestPreview = preview;
            bestQuality = quality;
          }
        }
      }

      // If we found a preview size that is big enough and has the
      // right aspect ratio, return it now.
      if (bestPreview) {
        return bestPreview;
      }
      debug('No preview size is big enough and has right aspect ratio.');

      // If we didn't find a preview size above, find a preview size
      // that has the right aspect ratio and is as close as possible
      // to the viewport size, even if it is smaller.
      for(i = 0; i < previewSizes.length; i++) {
        preview = previewSizes[i];

        if (aspectRatioMatches(preview)) {
          // If this preview size is closer to the viewport size than the
          // previous best preview size, then remember it as the best
          // we've seen so far.
          quality = matchQuality(preview);
          if (quality > bestQuality) {
            bestPreview = preview;
            bestQuality = quality;
          }
        }
      }

      // If we found something, return it.
      if (bestPreview) {
        return bestPreview;
      }
      debug('No preview size has right aspect ratio.');

      // If we still haven't found a size, then ignore aspect ratio
      // and pick the smallest size larger than the viewport
      for(i = 0; i < previewSizes.length; i++) {
        preview = previewSizes[i];

        if (bigEnough(preview)) {
          // If this preview size is closer to the viewport size than the
          // previous best preview size, then remember it as the best
          // we've seen so far.
          quality = matchQuality(preview);
          if (quality > bestQuality) {
            bestPreview = preview;
            bestQuality = quality;
          }
        }
      }

      // If we found something, return it.
      if (bestPreview) {
        return bestPreview;
      }
      debug('No preview size is big enough.');

      // And if there is still nothing, then ignore aspect ratio and
      // pick the closest size, even if it is smaller than the viewport
      for(i = 0; i < previewSizes.length; i++) {
        preview = previewSizes[i];

        // If this preview size is closer to the viewport size than the
        // previous best preview size, then remember it as the best
        // we've seen so far.
        quality = matchQuality(preview);
        if (quality > bestQuality) {
          bestPreview = preview;
          bestQuality = quality;
        }
      }

      // We're guaranteed to have found something by now.
      return bestPreview;
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

  CameraUtils.prototype = {
    constructor: CameraUtils
  };

  return CameraUtils;
});
