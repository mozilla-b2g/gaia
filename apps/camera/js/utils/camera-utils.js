define(function() {
  'use strict';

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

  /*
    Find the optimal preview size to maximize the area inside the viewport
    while minimizing the area overflowing outside the viewport.

    Rules:
    - Preview size aspect ratio must not change
    - Preview size must fit viewport dimensions or exceed them (overflow)
    - "Optimal" preview size is determined by having the smallest overflow
      area with the smallest scale adjustment (closest to 1.0)
    - If there is an exact match found, all further calculations are
      canceled and the preview size is returned immediately
  */
  CameraUtils.selectOptimalPreviewSize = function(viewportSize, previewSizes) {
    if (previewSizes && previewSizes.length === 0) {
      return null;
    }

    var vw = viewportSize.width,
        vh = viewportSize.height,
        calculatedPreviewSizes = [],
        minimumOverflow = Number.MAX_VALUE,
        pw, ph, sw, sh, scale, overflow;

    for (var i = 0, length = previewSizes.length; i < length; i++) {
      pw = previewSizes[i].width;
      ph = previewSizes[i].height;

      // Preview size is an EXACT match
      if (pw == vw && ph == vh) {
        return previewSizes[i];
      }

      // Calculate the scale required to FILL the viewport
      sw = vw / pw;
      sh = vh / ph;

      // Select the larger scale
      scale = Math.max(sw, sh);

      // Calculate the scaled preview size
      pw *= scale;
      ph *= scale;

      // Calculate the overflow area (number of pixels)
      overflow = (pw * ph) - (vw * vh);

      if (overflow < minimumOverflow) {
        minimumOverflow = overflow;
      }

      calculatedPreviewSizes.push({
        previewSize: previewSizes[i],
        pw: pw,
        ph: ph,
        scale: scale,
        overflow: overflow
      });
    }

    // Filter out preview sizes that exceed the minimum overflow
    calculatedPreviewSizes = calculatedPreviewSizes.filter(
      function(previewSize) {
        return previewSize.overflow <= minimumOverflow;
    });

    // Sort the preview sizes by scale closest to 1.0
    calculatedPreviewSizes = calculatedPreviewSizes.sort(function(a, b) {
      return a - b;
    }).sort(function(a, b) {
      return Math.abs(a.scale - 1) - Math.abs(b.scale - 1);
    });

    return calculatedPreviewSizes[0].previewSize;
  };

  CameraUtils.prototype = {
    constructor: CameraUtils
  };

  return CameraUtils;
});
