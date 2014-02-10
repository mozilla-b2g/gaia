define(function() {
  'use strict';

  var ImageUtils = function ImageUtils() {};

  ImageUtils.Filters = {
    grayscale: function(imageData, options) {
      var pixels = imageData.data;
      var r, g, b, v;
      for (var i = 0, length = pixels.length; i < length; i += 4) {
        r = pixels[i];
        g = pixels[i + 1];
        b = pixels[i + 2];

        v = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);

        pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
      }

      return imageData;
    },

    brightness: function(imageData, options) {
      var pixels = imageData.data;
      var value = options.value || 0;
      for (var i = 0, length = pixels.length; i < length; i += 4) {
        pixels[i]     += value;
        pixels[i + 1] += value;
        pixels[i + 2] += value;
      }

      return imageData;
    },

    threshold: function(imageData, options) {
      var pixels = imageData.data;
      var value = options.value || 128;
      var r, g, b, v;
      for (var i = 0, length = pixels.length; i < length; i += 4) {
        r = pixels[i];
        g = pixels[i + 1];
        b = pixels[i + 2];

        v = (r * 0.2126) + (g * 0.7152) + (b * 0.0722) < value ? 0 : 255;

        pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
      }

      return imageData;
    },

    convolute: function(imageData, options) {
      var pixels = imageData.data;
      var weights = options.weights;
      var opaque = !!options.opaque;

      var side = Math.round(Math.sqrt(weights.length));
      var halfSide = Math.floor(side / 2);
      var sw = imageData.width;
      var sh = imageData.height;
      var w = sw;
      var h = sh;

      var outputImageData = ImageUtils.createImageData(w, h);
      var outputPixels = outputImageData.data;

      var alphaFactor = opaque ? 1 : 0;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var sy = y;
          var sx = x;
          var dstOff = (y * w + x) * 4;
          var r = 0, g = 0, b = 0, a = 0;

          for (var cy = 0; cy < side; cy++) {
            for (var cx = 0; cx < side; cx++) {
              var scy = sy + cy - halfSide;
              var scx = sx + cx - halfSide;

              if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                var srcOff = (scy * sw + scx) * 4;
                var wt = weights[cy * side + cx];

                r += pixels[srcOff] * wt;
                g += pixels[srcOff + 1] * wt;
                b += pixels[srcOff + 2] * wt;
                a += pixels[srcOff + 3] * wt;
              }
            }
          }

          outputPixels[dstOff] = r;
          outputPixels[dstOff + 1] = g;
          outputPixels[dstOff + 2] = b;
          outputPixels[dstOff + 3] = a + alphaFactor * (255 - a);
        }
      }

      for (var i = 0, length = pixels.length; i < length; i++) {
        pixels[i] = outputPixels[i];
      }

      return imageData;
    },

    sharpen: function(imageData, options) {
      var v = 5;
      return ImageUtils.Filters.convolute(imageData, {
        weights: [ 0, -1,  0,
                  -1,  v, -1,
                   0, -1,  0 ]
      });
    },

    blur: function(imageData, options) {
      var v = 1 / 9;
      return ImageUtils.Filters.convolute(imageData, {
        weights: [ v,  v,  v,
                   v,  v,  v,
                   v,  v,  v ]
      });
    }
  };

  ImageUtils.createContext = function(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    return canvas.getContext('2d');
  };

  ImageUtils.createImageData = function(width, height) {
    var ctx = ImageUtils.createContext(width, height);
    return ctx.createImageData(width, height);
  };

  ImageUtils.prototype = {
    constructor: ImageUtils,

    image: null,
    canvas: null,

    ctx: null,

    loadImage: function(image, callback) {
      if (typeof image === 'string') {
        this.loadImageURL(image, callback);
      }

      else {
        this.loadImageBlob(image, callback);
      }
    },

    loadImageURL: function(url, callback) {
      var self = this;

      var image = this.image = new Image();
      image.onload = function(evt) {
        var canvas = self.canvas = document.createElement('canvas');
        canvas.width  = this.width;
        canvas.height = this.height;

        var ctx = self.ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0);

        if (typeof callback === 'function') {
          callback.call(self);
        }
      };

      image.src = url;
    },

    loadImageBlob: function(blob, callback) {
      this.loadImageURL(window.URL.createObjectURL(blob), callback);
    },

    toBlob: function(callback, type, quality) {
      var canvas = this.canvas;
      if (!canvas) {
        return;
      }

      return canvas.toBlob(callback, type, quality);
    },

    toDataURL: function(type) {
      var canvas = this.canvas;
      if (!canvas) {
        return;
      }

      return canvas.toDataURL(type);
    },

    applyFilter: function(filter, options) {
      if (typeof filter !== 'function') {
        return;
      }

      var ctx = this.ctx;
      if (!ctx) {
        return;
      }

      var canvas = this.canvas;
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      filter(imageData, options);

      ctx.putImageData(imageData, 0, 0);
    },

    scale: function(scale) {
      if (!scale) {
        return;
      }

      var image = this.image;
      if (!image) {
        return;
      }

      var canvas = this.canvas;
      if (!canvas) {
        return;
      }

      var ctx = this.ctx;
      if (!ctx) {
        return;
      }

      var width  = image.width;
      var height = image.height;

      var outputWidth  = width  * scale;
      var outputHeight = height * scale;

      var offsetX = Math.min((width  - outputWidth ) / 2, 0);
      var offsetY = Math.min((height - outputHeight) / 2, 0);

      canvas.width  = Math.min(width,  outputWidth);
      canvas.height = Math.min(height, outputHeight);

      ctx.drawImage(image, 0, 0, width, height, offsetX, offsetY,
                    outputWidth, outputHeight);

      this.loadImageURL(canvas.toDataURL());
    }
  };

  return ImageUtils;
});
