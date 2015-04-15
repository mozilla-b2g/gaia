'use strict';
/* global devicePixelRatio */
/* global Promise */

(function(exports) {

  const SHADOW_BLUR = 1;
  const SHADOW_OFFSET_Y = 1;
  const SHADOW_OFFSET_X = 1;
  const SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)';
  const DEFAULT_BACKGROUND_COLOR = 'rgb(228, 234, 238)';
  const UNSCALED_CANVAS_PADDING = 2;
  const CANVAS_PADDING = UNSCALED_CANVAS_PADDING * devicePixelRatio;

  function IconRenderer(icon) {
    this._icon = icon;
  }

  IconRenderer.TYPE = {
    CLIP: 'clip',
    FAVICON: 'favicon',
    STANDARD: 'standard',
  };

  IconRenderer.prototype = {

    // Export necessary defines. Left + right padding
    unscaledCanvasPadding: UNSCALED_CANVAS_PADDING * 2,

    /**
     * Returns the max size for an icon based on grid size which is based on
     * pixel ratio.
     */
    get _maxSize() {
      return this._icon.grid.layout.gridMaxIconSize;
    },

    /**
     * Creates a properly sized canvas to match the maxSize + padding
     * for shadows.
     * @return {HTMLCanvasElement}
     */
    _createCanvas: function() {
      // To get the smoother rounded circle for each icon, adding one pixel
      // padding in bottom to support different size of icon images
      const CANVAS_PADDING_BOTTOM = 1 * devicePixelRatio;
      var canvas = document.createElement('canvas');
      canvas.width = this._maxSize + (CANVAS_PADDING * 2);
      canvas.height = this._maxSize + CANVAS_PADDING + CANVAS_PADDING_BOTTOM;
      return canvas;
    },

    /**
     * Creates a properly sized canvas to match the maxSize + padding
     * for clip.
     * @return {HTMLCanvasElement}
     */
    _createClipCanvas: function() {
      var canvas = document.createElement('canvas');
      canvas.width = this._maxSize + (CANVAS_PADDING * 2);
      canvas.height = this._maxSize + (CANVAS_PADDING * 2);
      return canvas;
    },

    /**
     * Sets definitions for the shadow canvas.
     * @return {CanvasRenderingContext2D}
     */
    _decorateShadowCanvas: function(canvas) {
      var ctx = canvas.getContext('2d', { willReadFrequently: true });

      ctx.shadowColor = SHADOW_COLOR;
      ctx.shadowBlur = SHADOW_BLUR;
      ctx.shadowOffsetY = SHADOW_OFFSET_Y;
      ctx.shadowOffsetX = SHADOW_OFFSET_X;

      return ctx;
    },

    /**
     * Draws a clipped icon.
     * A clipped icon is generally a full-sized icon, with rounded corners
     * and a drop shadow.
     * @param {HTMLImageElement} img An image element to display from.
     * @return {Promise}
     */
    clip: function(img) {
      return new Promise((resolve) => {
        var shadowCanvas = this._createCanvas();
        var shadowCtx = this._decorateShadowCanvas(shadowCanvas);

        var clipCanvas = this._createClipCanvas();
        var clipCtx = clipCanvas.getContext('2d',
                                            { willReadFrequently: true });

        clipCtx.beginPath();
        clipCtx.arc(clipCanvas.width / 2, clipCanvas.height / 2,
                    clipCanvas.height / 2,
                    0, 2 * Math.PI);
        clipCtx.clip();
        clipCtx.drawImage(img, 0, 0,
                               clipCanvas.width, clipCanvas.height);

        shadowCtx.drawImage(clipCanvas, CANVAS_PADDING, CANVAS_PADDING,
                                this._maxSize, this._maxSize);
        shadowCanvas.toBlob(resolve);
      });
    },

    /**
     * Draws a favicon for the grid.
     * Favicons are generally smaller, and drawn on top of a background.
     * @param {HTMLImageElement} img An image element to display from.
     * @return {Promise}
     */
    favicon: function(img) {

      // If we have a decent sized image, we want to clip instead.
      if (img.width > this._icon.grid.layout.gridIconSize / 2) {
        return this.clip(img);
      }

      return new Promise((resolve) => {
        var shadowCanvas = this._createCanvas();
        var shadowCtx = this._decorateShadowCanvas(shadowCanvas);

        var iconWidth;
        var iconHeight;

        // Draws Shadow and default background circle
        shadowCtx.beginPath();
        shadowCtx.arc(shadowCanvas.width / 2,
                      shadowCanvas.height / 2,
                      shadowCanvas.height / 2 - CANVAS_PADDING,
                      0, 2 * Math.PI, false);
        shadowCtx.fillStyle = DEFAULT_BACKGROUND_COLOR;
        shadowCtx.fill();

        // Draws favicon with antinaliasing disabled
        iconWidth = iconHeight = this._maxSize * 0.55;
        // Disable smoothing on icon resize
        shadowCtx.shadowBlur = 0;
        shadowCtx.shadowOffsetY = 0;
        shadowCtx.mozImageSmoothingEnabled = false;
        shadowCtx.drawImage(img, (shadowCanvas.width - iconWidth) / 2,
                                      (shadowCanvas.height - iconHeight) / 2,
                                      iconWidth, iconHeight);
        shadowCanvas.toBlob(resolve);
      });
    },

    /**
     * Draws a standard icon for the grid.
     * Normal icons maintain their shape and are only given a shadow.
     * @param {HTMLImageElement} img An image element to display from.
     * @return {Promise}
     */
    standard: function(img) {
      return new Promise((resolve) => {
        var shadowCanvas = this._createCanvas();
        var shadowCtx = this._decorateShadowCanvas(shadowCanvas);
        shadowCtx.drawImage(img, CANVAS_PADDING, CANVAS_PADDING,
                      this._maxSize, this._maxSize);
        shadowCanvas.toBlob(resolve);
      });
    }
  };

  exports.GridIconRenderer = IconRenderer;

}(window));
