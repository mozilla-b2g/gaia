define(function() {
  'use strict';

  var CameraUtils = function CameraUtils() {};

  // Threshold for selectOptimalPreviewSize() to use when selecting
  // the "optimal" preview size. If the resulting preview size has
  // to be scaled by more than this value, the "optimal" preview
  // size will change priorities by selecting the preview size that
  // requires the least amount of scale adjustment instead of the
  // one that requires the least amount of viewport overflow.
  CameraUtils.OPTIMAL_PREVIEW_SCALE_THRESHOLD = 1.3;

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
    var optimalPreviewSize = CameraUtils.selectPreviewSizeWithMinimumOverflow(
                               viewportSize, previewSizes);
    if (!optimalPreviewSize) {
      return null;
    }

    if (optimalPreviewSize.scale >
          CameraUtils.OPTIMAL_PREVIEW_SCALE_THRESHOLD) {
      optimalPreviewSize = CameraUtils.selectPreviewSizeWithMinimumScaleDelta(
                             viewportSize, previewSizes);

      if (!optimalPreviewSize) {
        return null;
      }
    }
    
    return optimalPreviewSize.previewSize;
  };

  CameraUtils.calculatePreviewSizeAdjustments =
    function(viewportSize, previewSizes) {
      var vw = viewportSize.width,
          vh = viewportSize.height,
          previewSizeAdjustments = [],
          pw, ph, sw, sh, scale, scaleDelta, overflow;

      // Return an empty array if no preview sizes were specified.
      if (!previewSizes) {
        return previewSizeAdjustments;
      }

      for (var i = 0, length = previewSizes.length; i < length; i++) {
        pw = previewSizes[i].width;
        ph = previewSizes[i].height;

        // Calculate the scale required to FILL the viewport
        sw = vw / pw;
        sh = vh / ph;

        // Select the larger scale
        scale = Math.max(sw, sh);

        // Calculate the scale delta (scale +/- 1.0)
        // e.g.: 0.9 = 0.1, 1.0 = 0.0, 1.1 = 0.1, ...
        scaleDelta = Math.abs(scale - 1);

        // Calculate the scaled preview size
        pw *= scale;
        ph *= scale;

        // Calculate the overflow area (number of pixels)
        overflow = (pw * ph) - (vw * vh);

        // Round overflow down to integer to reduce rounding errors
        overflow = Math.floor(overflow);

        previewSizeAdjustments.push({
          previewSize: previewSizes[i],
          pw: pw,
          ph: ph,
          scale: scale,
          scaleDelta: scaleDelta,
          overflow: overflow
        });
      }

      return previewSizeAdjustments;
    };

  CameraUtils.selectPreviewSizeWithMinimumOverflow =
    function(viewportSize, previewSizes) {
      var previewSizeAdjustments = CameraUtils.calculatePreviewSizeAdjustments(
                                     viewportSize, previewSizes);

      // Return null if there are no preview sizes.
      if (previewSizeAdjustments.length === 0) {
        return null;
      }

      // Return only preview size if there is only one available.
      else if (previewSizeAdjustments.length === 1) {
        return previewSizeAdjustments[0];
      }

      // Sort by overflow amount (low to high).
      previewSizeAdjustments = previewSizeAdjustments.sort(function(a, b) {
        return a.overflow - b.overflow;
      });

      // Filter out preview sizes that exceed the minimum overflow.
      var minimumOverflow = previewSizeAdjustments[0].overflow;
      previewSizeAdjustments = previewSizeAdjustments.filter(function(o) {
        return o.overflow <= minimumOverflow;
      });

      // Sort the preview sizes by scale (low to high) and then by scale
      // delta (scale +/- 1.0, low to high). Sorting first by scale will
      // ensure when sorting by scale delta that scales <1.0 are favored
      // over scales >1.0 (giving precedence to preview sizes that need
      // to be scaled down instead of up in the event of a tie breaker).
      previewSizeAdjustments = previewSizeAdjustments.sort(function(a, b) {
        return a.scale - b.scale;
      }).sort(function(a, b) {
        return a.scaleDelta - b.scaleDelta;
      });

      // Return the first preview size after the sorting.
      return previewSizeAdjustments[0];
    };

  CameraUtils.selectPreviewSizeWithMinimumScaleDelta =
    function(viewportSize, previewSizes) {
      var previewSizeAdjustments = CameraUtils.calculatePreviewSizeAdjustments(
                                     viewportSize, previewSizes);

      // Return null if there are no preview sizes.
      if (previewSizeAdjustments.length === 0) {
        return null;
      }

      // Return only preview size if there is only one available.
      else if (previewSizeAdjustments.length === 1) {
        return previewSizeAdjustments[0];
      }

      // Sort by overflow amount (low to high).
      // Sort by scale delta amount (low to high).
      previewSizeAdjustments = previewSizeAdjustments.sort(function(a, b) {
        return a.scaleDelta - b.scaleDelta;
      });

      // Filter out preview sizes that exceed the minimum scale delta.
      var minimumScaleDelta = previewSizeAdjustments[0].scaleDelta;
      previewSizeAdjustments = previewSizeAdjustments.filter(function(o) {
        return o.scaleDelta <= minimumScaleDelta;
      });

      // Sort the preview sizes by scale (low to high) and then by
      // overflow (low to high). Sorting first by scale will ensure when
      // sorting by overflow that scales <1.0 are favored over scales >1.0
      // (giving precedence to preview sizes that need to be scaled down
      // instead of up in the event of a tie breaker).
      previewSizeAdjustments = previewSizeAdjustments.sort(function(a, b) {
        return a.scale - b.scale;
      }).sort(function(a, b) {
        return a.overflow - b.overflow;
      });

      // Return the first preview size after the sorting.
      return previewSizeAdjustments[0];
    };

  CameraUtils.prototype = {
    constructor: CameraUtils
  };

  return CameraUtils;
});
